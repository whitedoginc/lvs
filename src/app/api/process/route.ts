import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeTranscript } from '@/lib/ai/claude';
import { generateEmbedding, prepareTextForEmbedding } from '@/lib/ai/embeddings';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcriptId } = await request.json();

    if (!transcriptId) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 });
    }

    // Get the transcript
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (fetchError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Analyze with Claude
    const analysis = await analyzeTranscript(transcript.raw_content);

    // Generate embedding
    const embeddingText = prepareTextForEmbedding(analysis.summary, analysis.key_points);
    const embedding = await generateEmbedding(embeddingText);

    // Use admin client for operations that need to bypass RLS
    const adminClient = createAdminClient();

    // Update transcript with analysis
    const { error: updateError } = await adminClient
      .from('transcripts')
      .update({
        title: analysis.title,
        summary: analysis.summary,
        key_points: analysis.key_points,
        action_items: analysis.action_items,
        quotes: analysis.quotes,
        speakers: analysis.speakers,
        embedding: embedding,
        processed: true,
        processing_error: null,
      })
      .eq('id', transcriptId);

    if (updateError) {
      throw updateError;
    }

    // Handle topics - match or create
    for (const topicName of analysis.suggested_topics) {
      // Try to find existing topic (case-insensitive)
      const { data: existingTopics } = await adminClient
        .from('topics')
        .select('*')
        .ilike('name', topicName);

      let topicId: string;

      if (existingTopics && existingTopics.length > 0) {
        topicId = existingTopics[0].id;
      } else {
        // Create new topic
        const { data: newTopic, error: topicError } = await adminClient
          .from('topics')
          .insert({ name: topicName })
          .select()
          .single();

        if (topicError) {
          console.error('Error creating topic:', topicError);
          continue;
        }
        topicId = newTopic.id;
      }

      // Link transcript to topic
      await adminClient.from('transcript_topics').upsert(
        {
          transcript_id: transcriptId,
          topic_id: topicId,
          relevance_score: 1.0,
        },
        { onConflict: 'transcript_id,topic_id' }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Update transcript with error
    if (error instanceof Error) {
      const { transcriptId } = await request.json().catch(() => ({}));
      if (transcriptId) {
        const adminClient = createAdminClient();
        await adminClient
          .from('transcripts')
          .update({
            processing_error: error.message,
          })
          .eq('id', transcriptId);
      }
    }

    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: topicId } = await params;

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

    const { error } = await supabase
      .from('transcript_topics')
      .upsert({
        transcript_id: transcriptId,
        topic_id: topicId,
        relevance_score: 1.0,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding transcript to topic:', error);
    return NextResponse.json({ error: 'Failed to add transcript to topic' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: topicId } = await params;

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

    const { error } = await supabase
      .from('transcript_topics')
      .delete()
      .eq('transcript_id', transcriptId)
      .eq('topic_id', topicId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing transcript from topic:', error);
    return NextResponse.json({ error: 'Failed to remove transcript from topic' }, { status: 500 });
  }
}

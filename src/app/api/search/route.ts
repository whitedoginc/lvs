import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/ai/embeddings';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const topicId = searchParams.get('topic');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const speaker = searchParams.get('speaker');
    const limit = parseInt(searchParams.get('limit') || '20');

    const adminClient = createAdminClient();

    // If there's a semantic query, do vector search
    if (query) {
      const queryEmbedding = await generateEmbedding(query);

      // Use the search function
      const { data: results, error } = await adminClient.rpc('search_transcripts', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: limit,
      });

      if (error) {
        throw error;
      }

      // Get topics for each result
      const resultsWithTopics = await Promise.all(
        (results || []).map(async (result: { id: string }) => {
          const { data: topics } = await adminClient
            .from('transcript_topics')
            .select('topics(*)')
            .eq('transcript_id', result.id);

          return {
            ...result,
            topics: topics?.map((t: { topics: unknown }) => t.topics) || [],
          };
        })
      );

      return NextResponse.json({ results: resultsWithTopics });
    }

    // Otherwise, do filtered search
    let queryBuilder = adminClient
      .from('transcripts')
      .select(`
        id,
        title,
        summary,
        key_points,
        recorded_date,
        uploaded_at,
        speakers,
        transcript_topics(topics(*))
      `)
      .eq('processed', true)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (startDate) {
      queryBuilder = queryBuilder.gte('recorded_date', startDate);
    }

    if (endDate) {
      queryBuilder = queryBuilder.lte('recorded_date', endDate);
    }

    if (speaker) {
      queryBuilder = queryBuilder.contains('speakers', [speaker]);
    }

    const { data: transcripts, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    // Filter by topic if specified and transform results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let results: any[] = transcripts || [];
    if (topicId) {
      results = results.filter((t) =>
        t.transcript_topics?.some((tt: { topics?: { id: string } }) => tt.topics?.id === topicId)
      );
    }

    // Transform results
    const formattedResults = results.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      key_points: t.key_points,
      recorded_date: t.recorded_date,
      uploaded_at: t.uploaded_at,
      similarity: null,
      topics: t.transcript_topics?.map((tt: { topics: unknown }) => tt.topics) || [],
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

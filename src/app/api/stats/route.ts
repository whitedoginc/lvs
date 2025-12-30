import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total transcripts count
    const { count: totalTranscripts } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true });

    // Get total topics count
    const { count: totalTopics } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true });

    // Get this month's transcripts count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthTranscripts } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true })
      .gte('uploaded_at', startOfMonth.toISOString());

    // Get recent transcripts
    const { data: recentTranscripts } = await supabase
      .from('transcripts')
      .select(`
        *,
        transcript_topics(topics(*))
      `)
      .order('uploaded_at', { ascending: false })
      .limit(10);

    // Transform recent transcripts
    const formattedRecent = recentTranscripts?.map((t) => ({
      ...t,
      topics: t.transcript_topics?.map((tt: { topics: unknown }) => tt.topics) || [],
    }));

    return NextResponse.json({
      total_transcripts: totalTranscripts || 0,
      total_topics: totalTopics || 0,
      this_month_transcripts: thisMonthTranscripts || 0,
      recent_transcripts: formattedRecent || [],
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

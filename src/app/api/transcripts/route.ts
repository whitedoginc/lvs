import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select(`
        *,
        transcript_topics(topics(*))
      `)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Transform to include topics array
    const formattedTranscripts = transcripts?.map((t) => ({
      ...t,
      topics: t.transcript_topics?.map((tt: { topics: unknown }) => tt.topics) || [],
    }));

    return NextResponse.json({ transcripts: formattedTranscripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { raw_content, recorded_date } = await request.json();

    if (!raw_content || raw_content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Save raw content immediately (prioritize not losing data)
    const { data: transcript, error } = await supabase
      .from('transcripts')
      .insert({
        title: 'Processing...',
        raw_content: raw_content.trim(),
        recorded_date: recorded_date || null,
        uploaded_by: user.id,
        processed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error creating transcript:', error);
    return NextResponse.json({ error: 'Failed to create transcript' }, { status: 500 });
  }
}

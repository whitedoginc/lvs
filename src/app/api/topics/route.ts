import { NextRequest, NextResponse } from 'next/server';
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

    // Get topics with transcript count
    const { data: topics, error } = await supabase
      .from('topics')
      .select(`
        *,
        transcript_topics(count)
      `)
      .order('name');

    if (error) {
      throw error;
    }

    // Transform to include count
    const topicsWithCount = topics?.map((t) => ({
      ...t,
      transcript_count: t.transcript_topics?.[0]?.count || 0,
    }));

    return NextResponse.json({ topics: topicsWithCount });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
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

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Topic already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: topic, error } = await supabase
      .from('topics')
      .select(`
        *,
        transcript_topics(
          transcripts(
            id,
            title,
            summary,
            recorded_date,
            uploaded_at
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Transform to include transcripts array
    const formattedTopic = {
      ...topic,
      transcripts: topic.transcript_topics?.map((tt: { transcripts: unknown }) => tt.transcripts) || [],
    };

    return NextResponse.json({ topic: formattedTopic });
  } catch (error) {
    console.error('Error fetching topic:', error);
    return NextResponse.json({ error: 'Failed to fetch topic' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const { data: topic, error } = await supabase
      .from('topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Topic name already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Don't allow deleting the "Uncategorized" topic
    const { data: topic } = await supabase
      .from('topics')
      .select('name')
      .eq('id', id)
      .single();

    if (topic?.name === 'Uncategorized') {
      return NextResponse.json({ error: 'Cannot delete the Uncategorized topic' }, { status: 400 });
    }

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}

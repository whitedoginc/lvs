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

    const { data: transcript, error } = await supabase
      .from('transcripts')
      .select(`
        *,
        transcript_topics(topics(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Transform to include topics array
    const formattedTranscript = {
      ...transcript,
      topics: transcript.transcript_topics?.map((tt: { topics: unknown }) => tt.topics) || [],
    };

    return NextResponse.json({ transcript: formattedTranscript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
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

    const updates = await request.json();

    // Only allow updating certain fields
    const allowedFields = [
      'title',
      'summary',
      'key_points',
      'action_items',
      'quotes',
      'speakers',
      'recorded_date',
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    const { data: transcript, error } = await supabase
      .from('transcripts')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error updating transcript:', error);
    return NextResponse.json({ error: 'Failed to update transcript' }, { status: 500 });
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

    const { error } = await supabase
      .from('transcripts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    return NextResponse.json({ error: 'Failed to delete transcript' }, { status: 500 });
  }
}

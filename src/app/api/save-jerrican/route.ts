import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { team_id, start_time, finish_time, penalty_count, completed, updated_at } = body;

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const payload = {
      id: `jerrican_${team_id}`,
      team_id,
      start_time: start_time || null,
      finish_time: finish_time || null,
      penalty_count: penalty_count ?? 0,
      completed: !!completed,
      updated_at: updated_at || new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('jerrican_carry')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Jerrican save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error saving jerrican:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

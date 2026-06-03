import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { team_id, rapid_fire, finish_questionnaire, eye_for_detail_forced, finish_q_forced, updated_at } = body;

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const payload = {
      id: `manual_${team_id}`,
      team_id,
      rapid_fire: rapid_fire ?? 0,
      finish_questionnaire: finish_questionnaire ?? 0,
      eye_for_detail_forced: eye_for_detail_forced ?? false,
      finish_q_forced: finish_q_forced ?? false,
      updated_at: updated_at || new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('manual_scores')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Manual scores save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error saving manual scores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

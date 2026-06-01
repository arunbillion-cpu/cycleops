import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Expecting the payload shape from toGameAnswerPayload
    const { id, cyclist_id, cyclist_name, team_id, game, answers, score, correct, total, submitted_at } = body;

    if (!id || !cyclist_id || !game) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('game_answers').insert({
      id,
      cyclist_id,
      cyclist_name,
      team_id,
      game,
      answers,
      score,
      correct,
      total,
      submitted_at,
    });

    if (error) {
      console.error('Game answer submission error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error during game answer submission:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

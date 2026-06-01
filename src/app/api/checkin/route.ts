import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, cyclistId, cyclistName, teamId, cpId, timestamp } = body;

    if (!id || !cyclistId || !cpId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('checkins').insert({
      id,
      cyclist_id: cyclistId,
      cyclist_name: cyclistName,
      team_id: teamId,
      cp_id: cpId,
      timestamp,
      // gps is intentionally not stored (security policy)
    });

    if (error) {
      console.error('Check-in error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error during check-in:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

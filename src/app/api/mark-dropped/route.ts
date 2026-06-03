import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { cyclistId, dropped = true } = body;

    if (!cyclistId) {
      return NextResponse.json({ error: 'cyclistId is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('participants')
      .update({ dropped: !!dropped })
      .eq('id', cyclistId);

    if (error) {
      console.error('Mark dropped error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error marking dropped:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

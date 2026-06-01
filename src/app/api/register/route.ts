import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured for secure writes' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, name, age, phone, emergency, medical, teamId, password, registeredAt } = body;

    if (!id || !name || !password || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash password on server
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabaseAdmin.from('participants').insert({
      id,
      name,
      age: parseInt(age),
      phone,
      emergency,
      medical,
      team_id: teamId,
      password: hashedPassword,
      registered_at: registeredAt || new Date().toISOString(),
    });

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server error during registration:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

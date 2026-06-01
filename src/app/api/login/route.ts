import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }

    const fullName = name.trim().toLowerCase();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Find user using service role (server only)
    const { data: users, error } = await supabaseAdmin
      .from('participants')
      .select('*')
      .ilike('name', fullName)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    // Verify password on server
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return safe user object (never send password hash to client)
    const safeUser = {
      id: user.id,
      name: user.name,
      age: user.age,
      phone: user.phone,
      emergency: user.emergency,
      medical: user.medical,
      teamId: user.team_id,
      registeredAt: user.registered_at,
    };

    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

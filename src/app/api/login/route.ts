import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // === Rate Limiting: Max 5 login attempts per IP every 5 minutes ===
  const ip = getClientIP(request);
  const { allowed } = rateLimit(ip, {
    limit: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a few minutes before trying again.' },
      { status: 429 }
    );
  }

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
    // Explicit columns: never rely on *, and include password only for the server-side compare
    const { data: users, error } = await supabaseAdmin
      .from('participants')
      .select('id, name, age, phone, emergency, medical, team_id, registered_at, password')
      .ilike('name', fullName)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    // Safe diagnostic log (server only, never logs plain pw or full hash)
    const pw = user.password || '';
    const hashLen = pw.length;
    const looksBcrypt = /^\$2[abxy]\$/.test(pw);
    console.log(`[login] name=${fullName} hashLen=${hashLen} looksBcrypt=${looksBcrypt}`);

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

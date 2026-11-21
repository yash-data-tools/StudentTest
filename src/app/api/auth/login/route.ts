import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  logActivity,
  ensureAdminExists,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureAdminExists();
    const body = await req.json();
    const { username, password, expected_role } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: 'Please enter both username and password.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `login:${ip}:${cleanUsername}`;

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.` },
        { status: 429 }
      );
    }

    // 2. Fetch User
    const userRes = await query('SELECT * FROM users WHERE username = $1', [cleanUsername]);
    if (userRes.rowCount === 0) {
      recordFailedAttempt(rateLimitKey);
      await logActivity(null, 'failed_login', { username: cleanUsername, reason: 'user_not_found' });
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const user = userRes.rows[0];

    // 3. Verify Password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      recordFailedAttempt(rateLimitKey);
      await logActivity(user.id, 'failed_login', { username: cleanUsername, reason: 'invalid_password' });
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    // 4. Check Account Status
    if (user.status === 'inactive') {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your tutor.' },
        { status: 403 }
      );
    }

    if (user.status === 'pending_approval') {
      return NextResponse.json(
        { error: 'Your account is pending tutor approval. Please check back shortly.' },
        { status: 403 }
      );
    }

    // 5. Role check if explicit expected_role is supplied
    if (expected_role === 'admin' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This login is reserved for teachers and administrators.' },
        { status: 403 }
      );
    }

    // 6. Success: Clear rate limit, update last login, issue token
    resetRateLimit(rateLimitKey);
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
      real_name: user.real_name,
      school: user.school,
      status: user.status,
      must_change_password: user.must_change_password,
    });

    await setSessionCookie(token);

    await logActivity(user.id, 'successful_login', {
      role: user.role,
      username: user.username,
    });

    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';

    return NextResponse.json({
      success: true,
      role: user.role,
      redirect: redirectUrl,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        real_name: user.real_name,
        school: user.school,
      },
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during login.' }, { status: 500 });
  }
}

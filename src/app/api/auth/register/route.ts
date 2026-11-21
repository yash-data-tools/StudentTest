import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, setSessionCookie, logActivity, ensureAdminExists } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureAdminExists();
    const body = await req.json();
    const { real_name, school, username, password, confirm_password } = body;

    // 1. Validation
    if (!real_name?.trim() || !school?.trim() || !username?.trim() || !password) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    if (password !== confirm_password) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 2. Check for duplicate username
    const existing = await query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'This username is already taken. Please choose another.' }, { status: 409 });
    }

    // 3. Check registration mode setting
    const settingRes = await query('SELECT value FROM system_settings WHERE key = $1', ['registration_mode']);
    const regMode = settingRes.rows[0]?.value || 'open';
    const status = regMode === 'approval_required' ? 'pending_approval' : 'active';

    // 4. Hash password and insert
    const passwordHash = await hashPassword(password);
    const insertRes = await query(
      `INSERT INTO users (username, password_hash, role, real_name, school, status, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cleanUsername, passwordHash, 'student', real_name.trim(), school.trim(), status, false]
    );

    const newUser = insertRes.rows[0];

    // 5. Log activity
    await logActivity(newUser.id, 'student_registered', {
      username: cleanUsername,
      school: school.trim(),
      status,
    });

    if (status === 'pending_approval') {
      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: 'Registration submitted! Your teacher will activate your account before you can log in.',
      });
    }

    // 6. Automatic login for active student
    const token = await createSessionToken({
      id: newUser.id,
      username: newUser.username,
      role: 'student',
      real_name: newUser.real_name,
      school: newUser.school,
      status: newUser.status,
    });

    await setSessionCookie(token);

    await logActivity(newUser.id, 'student_logged_in', { username: cleanUsername });

    return NextResponse.json({
      success: true,
      redirect: '/student/dashboard',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during registration.' }, { status: 500 });
  }
}

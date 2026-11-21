import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, logActivity } from '@/lib/auth';
import { getStudentsList, query, readLocalDB } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const students = await getStudentsList(search, status);
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { real_name, school, username, password, must_change_password } = body;

    if (!real_name?.trim() || !username?.trim() || !password) {
      return NextResponse.json({ error: 'Name, username, and password are required.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check duplicate
    const existing = await query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Username already in use.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const insertRes = await query(
      `INSERT INTO users (username, password_hash, role, real_name, school, status, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cleanUsername, passwordHash, 'student', real_name.trim(), school?.trim() || '', 'active', Boolean(must_change_password)]
    );

    const newStudent = insertRes.rows[0];

    await logActivity(user.id, 'student_created_by_admin', {
      created_student_id: newStudent.id,
      created_username: cleanUsername,
    });

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}

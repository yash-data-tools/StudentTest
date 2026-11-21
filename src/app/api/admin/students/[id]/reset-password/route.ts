import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, logActivity } from '@/lib/auth';
import { updateStudentPassword } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { new_password, must_change_password } = body;

    if (!new_password || new_password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    const hash = await hashPassword(new_password);
    const updated = await updateStudentPassword(id, hash, Boolean(must_change_password));

    if (!updated) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await logActivity(user.id, 'password_reset_by_admin', {
      target_student_id: id,
      target_username: updated.username,
      forced_next_change: Boolean(must_change_password),
    });

    return NextResponse.json({
      success: true,
      message: `Password successfully reset for @${updated.username}.`,
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

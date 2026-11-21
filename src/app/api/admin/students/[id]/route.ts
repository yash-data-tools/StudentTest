import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { updateStudentDetails, readLocalDB, writeLocalDB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { real_name, school, status, must_change_password } = body;

    const updated = await updateStudentDetails(id, {
      real_name,
      school,
      status,
      must_change_password,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Log status events
    if (status) {
      await logActivity(user.id, status === 'active' ? 'account_activated' : 'account_deactivated', {
        target_student_id: id,
        target_username: updated.username,
        status,
      });
    }

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const db = readLocalDB();
    const index = db.users.findIndex(u => u.id === id && u.role === 'student');
    if (index === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const deleted = db.users.splice(index, 1)[0];
    writeLocalDB(db);

    await logActivity(user.id, 'student_deleted_by_admin', {
      deleted_student_id: id,
      deleted_username: deleted.username,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}

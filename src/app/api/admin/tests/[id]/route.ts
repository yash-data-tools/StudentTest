import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { readLocalDB, writeLocalDB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;
    const body = await req.json();
    const { status, start_date, end_date, title, duration_minutes } = body;

    const db = readLocalDB();
    const test = db.tests.find(t => t.id === testId);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (status !== undefined) test.status = status;
    if (start_date !== undefined) test.start_date = start_date;
    if (end_date !== undefined) test.end_date = end_date;
    if (title !== undefined) test.title = title.trim();
    if (duration_minutes !== undefined) test.duration_minutes = Number(duration_minutes);
    test.updated_at = new Date().toISOString();

    writeLocalDB(db);

    await logActivity(user.id, 'test_status_updated', {
      test_id: testId,
      new_status: test.status,
      start_date: test.start_date,
      end_date: test.end_date,
    });

    return NextResponse.json({
      success: true,
      test,
      message: `Test status successfully updated to ${test.status}.`,
    });
  } catch (error: any) {
    console.error('Update test error:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;
    const db = readLocalDB();

    const tIdx = db.tests.findIndex(t => t.id === testId);
    if (tIdx === -1) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    db.tests.splice(tIdx, 1);
    // Remove questions & options
    const qIds = db.questions.filter(q => q.test_id === testId).map(q => q.id);
    db.questions = db.questions.filter(q => q.test_id !== testId);
    db.question_options = db.question_options.filter(o => !qIds.includes(o.question_id));

    writeLocalDB(db);

    await logActivity(user.id, 'test_deleted', { test_id: testId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete test error:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}

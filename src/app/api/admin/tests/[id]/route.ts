import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;
    const body = await req.json();
    const { status, start_date, end_date, title, duration_minutes } = body;

    const testRes = await query(`SELECT * FROM tests WHERE id = $1`, [testId]);
    if (testRes.rowCount === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const updatedRes = await query(
      `UPDATE tests
       SET status = COALESCE($1, status),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           title = COALESCE($4, title),
           duration_minutes = COALESCE($5, duration_minutes),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        status !== undefined ? status : null,
        start_date !== undefined ? start_date : null,
        end_date !== undefined ? end_date : null,
        title !== undefined ? title.trim() : null,
        duration_minutes !== undefined ? Number(duration_minutes) : null,
        testId,
      ]
    );

    const test = updatedRes.rows[0];

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

    const deleteRes = await query(`DELETE FROM tests WHERE id = $1 RETURNING id, title`, [testId]);
    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    await logActivity(user.id, 'test_deleted', {
      test_id: testId,
      title: deleteRes.rows[0].title,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete test error:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}

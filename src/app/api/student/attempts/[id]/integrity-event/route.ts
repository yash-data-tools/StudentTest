import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logIntegrityEvent, query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { event_type, duration_seconds, metadata } = body;

    const attemptRes = await query(
      `SELECT test_id FROM test_attempts WHERE id = $1 AND student_id = $2`,
      [attemptId, user.id]
    );

    if (attemptRes.rowCount === 0) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const testId = attemptRes.rows[0].test_id;

    const event = await logIntegrityEvent(
      attemptId,
      user.id,
      testId,
      event_type || 'unknown_event',
      duration_seconds || 0,
      metadata || {}
    );

    return NextResponse.json({ success: true, eventId: event?.id });
  } catch (error: any) {
    console.error('Integrity event log error:', error);
    return NextResponse.json({ error: 'Failed to log integrity event' }, { status: 500 });
  }
}

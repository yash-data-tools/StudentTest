import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: studentId } = await params;

    const studentRes = await query(
      `SELECT id, real_name, username, school FROM users WHERE id = $1 AND role = 'student'`,
      [studentId]
    );

    if (studentRes.rowCount === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    const attemptsRes = await query(
      `SELECT a.id, a.test_id, a.status, a.started_at, a.submitted_at,
              a.time_spent_seconds, a.final_score, a.total_marks_possible, a.percentage,
              COALESCE(t.title, 'Unknown Test') AS test_title,
              COALESCE(t.subject, 'General') AS subject,
              COALESCE(t.exam_mode, 'instant_quick_test') AS exam_mode,
              (SELECT COUNT(*)::int FROM integrity_events e WHERE e.attempt_id = a.id) AS integrity_count
       FROM test_attempts a
       LEFT JOIN tests t ON t.id = a.test_id
       WHERE a.student_id = $1
       ORDER BY a.started_at DESC`,
      [studentId]
    );

    const attempts = attemptsRes.rows.map((a: any) => ({
      id: a.id,
      test_id: a.test_id,
      test_title: a.test_title,
      subject: a.subject,
      exam_mode: a.exam_mode,
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      time_spent_seconds: Number(a.time_spent_seconds) || 0,
      final_score: Number(a.final_score) || 0,
      total_marks_possible: Number(a.total_marks_possible) || 0,
      percentage: Number(a.percentage) || 0,
      integrity_count: Number(a.integrity_count) || 0,
    }));

    return NextResponse.json({
      success: true,
      student,
      attempts,
    });
  } catch (error: any) {
    console.error('Error fetching student attempts:', error);
    return NextResponse.json({ error: 'Failed to fetch student attempts' }, { status: 500 });
  }
}

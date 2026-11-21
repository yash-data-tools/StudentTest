import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;

    const testRes = await query(`SELECT * FROM tests WHERE id = $1`, [testId]);
    if (testRes.rowCount === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }
    const test = testRes.rows[0];

    const attemptsRes = await query(
      `SELECT a.*,
              COALESCE(u.real_name, 'Unknown Student') AS student_name,
              COALESCE(u.username, 'unknown') AS username,
              COALESCE(u.school, '-') AS school,
              (SELECT COUNT(*)::int FROM integrity_events e WHERE e.attempt_id = a.id) AS suspicious_events_count
       FROM test_attempts a
       LEFT JOIN users u ON u.id = a.student_id
       WHERE a.test_id = $1
       ORDER BY COALESCE(a.submitted_at, a.started_at) DESC`,
      [testId]
    );

    const attempts = attemptsRes.rows.map((a: any) => ({
      id: a.id,
      student_id: a.student_id,
      student_name: a.student_name,
      username: a.username,
      school: a.school,
      status: a.status,
      total_marks_possible: Number(a.total_marks_possible),
      provisional_academic_score: Number(a.provisional_academic_score),
      teacher_adjusted_score:
        a.teacher_adjusted_score !== null ? Number(a.teacher_adjusted_score) : null,
      integrity_deduction: Number(a.integrity_deduction) || 0,
      final_score: Number(a.final_score),
      percentage: Number(a.percentage),
      time_spent_seconds: Number(a.time_spent_seconds) || 0,
      is_auto_submitted: a.is_auto_submitted,
      suspicious_events_count: Number(a.suspicious_events_count) || 0,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
    }));

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        chapter: test.chapter,
        total_marks: Number(test.total_marks),
        duration_minutes: Number(test.duration_minutes),
        exam_mode: test.exam_mode,
        status: test.status,
        start_date: test.start_date,
        end_date: test.end_date,
      },
      attempts,
    });
  } catch (error: any) {
    console.error('Fetch test attempts error:', error);
    return NextResponse.json({ error: 'Failed to fetch attempts for this test' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const res = await query(`
      SELECT a.id, a.student_id, a.test_id, a.status,
             a.total_marks_possible, a.provisional_academic_score, a.teacher_adjusted_score,
             a.integrity_deduction, a.final_score, a.percentage, a.time_spent_seconds,
             a.is_auto_submitted, a.submitted_at, a.created_at,
             COALESCE(u.real_name, 'Unknown Student') AS student_name,
             COALESCE(u.username, 'unknown') AS username,
             COALESCE(u.school, '-') AS school,
             COALESCE(t.title, 'Examination') AS test_title,
             COALESCE(t.exam_mode, 'teacher_reviewed') AS exam_mode,
             (SELECT COUNT(*)::int FROM integrity_events e WHERE e.attempt_id = a.id) AS suspicious_events_count
      FROM test_attempts a
      LEFT JOIN users u ON u.id = a.student_id
      LEFT JOIN tests t ON t.id = a.test_id
      WHERE a.status IN ('pending_review', 'published', 'submitted')
      ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
    `);

    const attempts = res.rows.map((a: any) => ({
      ...a,
      total_marks_possible: Number(a.total_marks_possible),
      provisional_academic_score: Number(a.provisional_academic_score),
      teacher_adjusted_score:
        a.teacher_adjusted_score !== null ? Number(a.teacher_adjusted_score) : null,
      integrity_deduction: Number(a.integrity_deduction) || 0,
      final_score: Number(a.final_score),
      percentage: Number(a.percentage),
      time_spent_seconds: Number(a.time_spent_seconds) || 0,
      suspicious_events_count: Number(a.suspicious_events_count) || 0,
      submitted_at: a.submitted_at || a.created_at,
    }));

    return NextResponse.json({ success: true, attempts });
  } catch (error: any) {
    console.error('Fetch pending reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = readLocalDB();

    // Fetch attempts that are pending teacher review or published
    const attempts = db.test_attempts
      .filter(a => a.status === 'pending_review' || a.status === 'published' || a.status === 'submitted')
      .map(a => {
        const student = db.users.find(u => u.id === a.student_id);
        const test = db.tests.find(t => t.id === a.test_id);
        const integrityEventsCount = db.integrity_events.filter(e => e.attempt_id === a.id).length;

        return {
          id: a.id,
          student_id: a.student_id,
          student_name: student?.real_name || 'Unknown Student',
          username: student?.username || 'unknown',
          school: student?.school || '-',
          test_id: a.test_id,
          test_title: test?.title || 'Examination',
          exam_mode: test?.exam_mode || 'teacher_reviewed',
          status: a.status,
          total_marks_possible: a.total_marks_possible,
          provisional_academic_score: a.provisional_academic_score,
          teacher_adjusted_score: a.teacher_adjusted_score,
          integrity_deduction: a.integrity_deduction || 0,
          final_score: a.final_score,
          percentage: a.percentage,
          time_spent_seconds: a.time_spent_seconds,
          is_auto_submitted: a.is_auto_submitted,
          suspicious_events_count: integrityEventsCount,
          submitted_at: a.submitted_at || a.created_at,
        };
      })
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    return NextResponse.json({ success: true, attempts });
  } catch (error: any) {
    console.error('Fetch pending reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
  }
}

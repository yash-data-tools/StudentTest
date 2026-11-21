import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;
    const db = readLocalDB();

    const test = db.tests.find(t => t.id === testId);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const attempts = db.test_attempts
      .filter(a => a.test_id === testId)
      .map(a => {
        const student = db.users.find(u => u.id === a.student_id);
        const integrityEventsCount = db.integrity_events.filter(e => e.attempt_id === a.id).length;

        return {
          id: a.id,
          student_id: a.student_id,
          student_name: student?.real_name || 'Unknown Student',
          username: student?.username || 'unknown',
          school: student?.school || '-',
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
          started_at: a.started_at,
          submitted_at: a.submitted_at,
        };
      })
      .sort((a, b) => new Date(b.submitted_at || b.started_at).getTime() - new Date(a.submitted_at || a.started_at).getTime());

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        chapter: test.chapter,
        total_marks: test.total_marks,
        duration_minutes: test.duration_minutes,
        exam_mode: test.exam_mode,
        status: test.status,
        start_date: test.start_date,
        end_date: test.end_date,
      },
      attempts,
    });
  } catch (error: any) {
    console.error('Fetch test attempts error:', error);
    return NextResponse.json({ error: 'Failed to fetch test attempts' }, { status: 500 });
  }
}

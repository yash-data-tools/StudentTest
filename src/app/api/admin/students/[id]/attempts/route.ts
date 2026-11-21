import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: studentId } = await params;
    const db = readLocalDB();

    const student = db.users.find((u) => u.id === studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const attempts = db.test_attempts
      .filter((a) => a.student_id === studentId)
      .map((a) => {
        const test = db.tests.find((t) => t.id === a.test_id);
        const integrityCount = db.integrity_events.filter(
          (e) => e.attempt_id === a.id
        ).length;

        return {
          id: a.id,
          test_id: a.test_id,
          test_title: test?.title || 'Unknown Test',
          subject: test?.subject || 'General',
          exam_mode: test?.exam_mode || 'instant_quick_test',
          status: a.status,
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          time_spent_seconds: a.time_spent_seconds,
          final_score: a.final_score,
          total_marks_possible: a.total_marks_possible,
          percentage: a.percentage,
          integrity_count: integrityCount,
        };
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        real_name: student.real_name,
        username: student.username,
        school: student.school,
      },
      attempts,
    });
  } catch (error: any) {
    console.error('Error fetching student attempts:', error);
    return NextResponse.json({ error: 'Failed to fetch student attempts' }, { status: 500 });
  }
}

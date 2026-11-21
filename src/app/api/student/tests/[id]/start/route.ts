import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { getExamQuestionsForStudent, startOrCreateExamAttempt } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: testId } = await params;

    const examData = await getExamQuestionsForStudent(testId);
    if (!examData) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const attemptData = await startOrCreateExamAttempt(user.id, testId);
    if (!attemptData) {
      return NextResponse.json({ error: 'Failed to start examination attempt.' }, { status: 500 });
    }

    await logActivity(user.id, 'test_started', {
      test_id: testId,
      attempt_id: attemptData.attempt.id,
      title: examData.test.title,
    });

    return NextResponse.json({
      success: true,
      test: examData.test,
      questions: examData.questions,
      attempt: attemptData.attempt,
      savedResponses: attemptData.responses,
    });
  } catch (error: any) {
    console.error('Start exam error:', error);
    return NextResponse.json({ error: 'Failed to initialize exam' }, { status: 500 });
  }
}

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

    const now = Date.now();
    const test = examData.test;

    if (test.status === 'closed') {
      return NextResponse.json(
        { error: 'This exam has been stopped or closed by the tutor.' },
        { status: 400 }
      );
    }

    if (test.start_date && new Date(test.start_date).getTime() > now) {
      return NextResponse.json(
        {
          error: `This exam is scheduled to start at ${new Date(
            test.start_date
          ).toLocaleString()}. You cannot start early.`,
        },
        { status: 400 }
      );
    }

    if (test.end_date && new Date(test.end_date).getTime() < now) {
      return NextResponse.json(
        { error: 'The deadline for taking this exam has passed.' },
        { status: 400 }
      );
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
      savedAttachments: attemptData.attachments || [],
    });
  } catch (error: any) {
    console.error('Start exam error:', error);
    return NextResponse.json({ error: 'Failed to initialize exam' }, { status: 500 });
  }
}

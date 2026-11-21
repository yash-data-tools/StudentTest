import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { generateAiQuickTest } from '@/lib/ai-services';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { subject, chapter, topic, class_grade, difficulty, total_marks, duration_minutes, negative_marking } = body;

    if (!subject || !chapter) {
      return NextResponse.json({ error: 'Subject and Chapter are required.' }, { status: 400 });
    }

    const examData = await generateAiQuickTest({
      subject,
      chapter,
      topic,
      class_grade,
      difficulty: difficulty || 'mixed',
      total_marks: Number(total_marks) || 10,
      duration_minutes: Number(duration_minutes) || 15,
      negative_marking: Boolean(negative_marking),
    });

    await logActivity(user.id, 'ai_quick_test_generated', {
      subject,
      chapter,
      marks: examData.total_marks,
      questions: examData.questions.length,
    });

    return NextResponse.json({ success: true, examData });
  } catch (error: any) {
    console.error('Quick test generation route error:', error);
    return NextResponse.json({ error: 'Failed to generate AI Quick Test.' }, { status: 500 });
  }
}

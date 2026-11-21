import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveSingleStudentResponse } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { question_id, selected_options, numerical_response, text_response, is_visited, is_marked_for_review, is_answered } = body;

    if (!question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 });
    }

    const saved = await saveSingleStudentResponse(attemptId, question_id, {
      selected_options,
      numerical_response,
      text_response,
      is_visited,
      is_marked_for_review,
      is_answered,
    });

    return NextResponse.json({ success: true, response: saved });
  } catch (error: any) {
    console.error('Save response error:', error);
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
  }
}

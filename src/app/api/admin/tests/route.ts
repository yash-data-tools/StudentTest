import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { readLocalDB, writeLocalDB } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = readLocalDB();
    const tests = db.tests.map(t => {
      const qCount = db.questions.filter(q => q.test_id === t.id).length;
      const attemptCount = db.test_attempts.filter(a => a.test_id === t.id).length;
      return {
        ...t,
        question_count: qCount,
        total_attempts: attemptCount,
      };
    });

    return NextResponse.json({
      success: true,
      tests: tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    });
  } catch (error: any) {
    console.error('Fetch tests error:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      subject,
      chapter,
      topic,
      class_grade,
      description,
      instructions,
      total_marks,
      duration_minutes,
      exam_mode,
      status,
      negative_marking_enabled,
      shuffle_questions,
      shuffle_options,
      anti_cheat_settings,
      questions,
    } = body;

    if (!title || !subject || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Test title, subject, and at least one question are required.' }, { status: 400 });
    }

    const db = readLocalDB();
    const testId = crypto.randomUUID();

    const newTest = {
      id: testId,
      title: title.trim(),
      subject: subject.trim(),
      chapter: chapter?.trim() || '',
      topic: topic?.trim() || '',
      class_grade: class_grade?.trim() || '',
      description: description?.trim() || '',
      instructions: instructions?.trim() || '',
      total_marks: Number(total_marks) || questions.reduce((acc: number, q: any) => acc + (Number(q.marks) || 1), 0),
      duration_minutes: Number(duration_minutes) || 60,
      exam_mode: exam_mode || 'teacher_reviewed',
      status: status || 'published',
      negative_marking_enabled: Boolean(negative_marking_enabled),
      shuffle_questions: Boolean(shuffle_questions),
      shuffle_options: Boolean(shuffle_options),
      anti_cheat_settings: anti_cheat_settings || {
        fullscreen_required: false,
        tab_monitoring: true,
        clipboard_monitoring: true,
        context_menu_disabled: true,
        keyboard_monitoring: true,
        idle_monitoring: true,
      },
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.tests.push(newTest);

    // Save questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = crypto.randomUUID();

      const newQ = {
        id: qId,
        test_id: testId,
        question_number: i + 1,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq_single',
        marks: Number(q.marks) || 1,
        negative_marks: Number(q.negative_marks) || 0,
        explanation: q.explanation || '',
        numerical_answer: q.numerical_answer !== undefined ? Number(q.numerical_answer) : null,
        numerical_tolerance: q.numerical_tolerance !== undefined ? Number(q.numerical_tolerance) : 0,
        numerical_tolerance_type: q.numerical_tolerance_type || 'exact',
        ai_confidence: q.ai_confidence || 1.0,
        requires_verification: Boolean(q.requires_verification),
        order_index: i,
        created_at: new Date().toISOString(),
      };

      db.questions.push(newQ);

      // Save options if present
      if (q.options && Array.isArray(q.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          db.question_options.push({
            id: crypto.randomUUID(),
            question_id: qId,
            option_letter: opt.option_letter || String.fromCharCode(65 + j),
            option_text: opt.option_text,
            is_correct: Boolean(opt.is_correct),
            order_index: j,
          });
        }
      }
    }

    writeLocalDB(db);

    await logActivity(user.id, 'test_created', {
      test_id: testId,
      title: newTest.title,
      question_count: questions.length,
      mode: newTest.exam_mode,
      status: newTest.status,
    });

    return NextResponse.json({
      success: true,
      testId,
      message: `Test "${newTest.title}" successfully saved with ${questions.length} questions!`,
    });
  } catch (error: any) {
    console.error('Create test error:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}

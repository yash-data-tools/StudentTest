import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const res = await query(`
      SELECT t.*,
             (SELECT COUNT(*)::int FROM questions q WHERE q.test_id = t.id) AS question_count,
             (SELECT COUNT(*)::int FROM test_attempts a WHERE a.test_id = t.id) AS total_attempts
      FROM tests t
      ORDER BY t.created_at DESC
    `);

    const tests = res.rows.map((t: any) => ({
      ...t,
      total_marks: Number(t.total_marks),
      duration_minutes: Number(t.duration_minutes),
      question_count: Number(t.question_count) || 0,
      total_attempts: Number(t.total_attempts) || 0,
    }));

    return NextResponse.json({ success: true, tests });
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
      start_date,
      end_date,
      max_attempts,
      negative_marking_enabled,
      shuffle_questions,
      shuffle_options,
      anti_cheat_settings,
      questions,
    } = body;

    if (!title || !subject || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Test title, subject, and at least one question are required.' },
        { status: 400 }
      );
    }

    const computedTotalMarks =
      Number(total_marks) ||
      questions.reduce((acc: number, q: any) => acc + (Number(q.marks) || 1), 0);

    const testRes = await query(
      `INSERT INTO tests (
        title, subject, chapter, topic, class_grade, description, instructions,
        total_marks, duration_minutes, exam_mode, status, start_date, end_date,
        max_attempts, negative_marking_enabled, shuffle_questions, shuffle_options,
        anti_cheat_settings, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *`,
      [
        title.trim(),
        subject.trim(),
        chapter?.trim() || '',
        topic?.trim() || '',
        class_grade?.trim() || '',
        description?.trim() || '',
        instructions?.trim() || '',
        computedTotalMarks,
        Number(duration_minutes) || 60,
        exam_mode || 'teacher_reviewed',
        status || 'published',
        start_date || null,
        end_date || null,
        Number(max_attempts) || 1,
        Boolean(negative_marking_enabled),
        Boolean(shuffle_questions),
        Boolean(shuffle_options),
        JSON.stringify(
          anti_cheat_settings || {
            fullscreen_required: false,
            tab_monitoring: true,
            clipboard_monitoring: true,
            context_menu_disabled: true,
            keyboard_monitoring: true,
            idle_monitoring: true,
          }
        ),
        user.id,
      ]
    );

    const createdTest = testRes.rows[0];
    const testId = createdTest.id;

    // Insert questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      const qRes = await query(
        `INSERT INTO questions (
          test_id, question_number, question_text, question_type, marks, negative_marks,
          explanation, numerical_answer, numerical_tolerance, numerical_tolerance_type,
          numerical_unit, assertion_text, reason_text, matching_pairs, rubric,
          allow_handwritten, allow_typed, image_url, ai_confidence, requires_verification,
          order_index, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
        RETURNING id`,
        [
          testId,
          qNum,
          q.question_text,
          q.question_type || 'mcq_single',
          Number(q.marks) || 1,
          Number(q.negative_marks) || 0,
          q.explanation || '',
          q.numerical_answer !== undefined && q.numerical_answer !== null
            ? Number(q.numerical_answer)
            : null,
          q.numerical_tolerance !== undefined ? Number(q.numerical_tolerance) : 0,
          q.numerical_tolerance_type || 'exact',
          q.numerical_unit || null,
          q.assertion_text || null,
          q.reason_text || null,
          q.matching_pairs ? JSON.stringify(q.matching_pairs) : null,
          q.rubric ? JSON.stringify(q.rubric) : null,
          q.allow_handwritten !== false,
          q.allow_typed !== false,
          q.image_url || null,
          q.ai_confidence || 1.0,
          Boolean(q.requires_verification),
          i,
        ]
      );

      const qId = qRes.rows[0].id;

      // Insert options if present
      if (q.options && Array.isArray(q.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          await query(
            `INSERT INTO question_options (
              question_id, option_letter, option_text, is_correct, order_index
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              qId,
              opt.option_letter || String.fromCharCode(65 + j),
              opt.option_text,
              Boolean(opt.is_correct),
              j,
            ]
          );
        }
      }
    }

    await logActivity(user.id, 'test_created', {
      test_id: testId,
      title: createdTest.title,
      question_count: questions.length,
      mode: createdTest.exam_mode,
      status: createdTest.status,
    });

    return NextResponse.json({
      success: true,
      testId,
      message: `Test "${createdTest.title}" successfully saved with ${questions.length} questions!`,
    });
  } catch (error: any) {
    console.error('Create test error:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}

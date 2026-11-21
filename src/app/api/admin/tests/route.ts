import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import {
  normalizeQuestionType,
  normalizeToleranceType,
  sanitizeDbErrorMessage,
} from '@/lib/question-types';

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

    // Step 1: Pre-validate and normalize all question types and tolerance types upfront
    // This prevents partial saves and guarantees explicit rejection of unsupported types
    const normalizedQuestions: any[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      const typeResult = normalizeQuestionType(q.question_type, qNum);
      if (!typeResult.valid) {
        return NextResponse.json(
          { error: typeResult.error || `Question #${qNum} has an unsupported question type.` },
          { status: 400 }
        );
      }

      normalizedQuestions.push({
        ...q,
        question_number: qNum,
        question_text: typeof q.question_text === 'string' ? q.question_text.trim() : `Question ${qNum}`,
        question_type: typeResult.questionType!,
        marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
        negative_marks: Number(q.negative_marks) >= 0 ? Number(q.negative_marks) : 0,
        explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
        numerical_answer:
          q.numerical_answer !== undefined && q.numerical_answer !== null && !isNaN(Number(q.numerical_answer))
            ? Number(q.numerical_answer)
            : null,
        numerical_tolerance:
          q.numerical_tolerance !== undefined && !isNaN(Number(q.numerical_tolerance))
            ? Number(q.numerical_tolerance)
            : 0,
        numerical_tolerance_type: normalizeToleranceType(q.numerical_tolerance_type),
        numerical_unit: typeof q.numerical_unit === 'string' ? q.numerical_unit.trim() : null,
        assertion_text: typeof q.assertion_text === 'string' ? q.assertion_text.trim() : null,
        reason_text: typeof q.reason_text === 'string' ? q.reason_text.trim() : null,
        matching_pairs: Array.isArray(q.matching_pairs) ? q.matching_pairs : null,
        rubric: Array.isArray(q.rubric) ? q.rubric : null,
        allow_handwritten: q.allow_handwritten !== false,
        allow_typed: q.allow_typed !== false,
        image_url: typeof q.image_url === 'string' ? q.image_url : null,
        ai_confidence: Number(q.ai_confidence) || 1.0,
        requires_verification: Boolean(q.requires_verification),
      });
    }

    const computedTotalMarks =
      Number(total_marks) ||
      normalizedQuestions.reduce((acc: number, q: any) => acc + (Number(q.marks) || 1), 0);

    // Step 2: Atomic Transactional Creation
    // Ensures tests, questions, and options succeed together or rollback completely
    const { createdTest, testId } = await withTransaction(async (tx) => {
      const testRes = await tx.query(
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

      const created = testRes.rows[0];
      const newTestId = created.id;

      for (let i = 0; i < normalizedQuestions.length; i++) {
        const q = normalizedQuestions[i];

        const qRes = await tx.query(
          `INSERT INTO questions (
            test_id, question_number, question_text, question_type, marks, negative_marks,
            explanation, numerical_answer, numerical_tolerance, numerical_tolerance_type,
            numerical_unit, assertion_text, reason_text, matching_pairs, rubric,
            allow_handwritten, allow_typed, image_url, ai_confidence, requires_verification,
            order_index, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
          RETURNING id`,
          [
            newTestId,
            q.question_number,
            q.question_text,
            q.question_type,
            Number(q.marks) || 1,
            Number(q.negative_marks) || 0,
            q.explanation || '',
            q.numerical_answer,
            q.numerical_tolerance,
            q.numerical_tolerance_type,
            q.numerical_unit,
            q.assertion_text,
            q.reason_text,
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
            await tx.query(
              `INSERT INTO question_options (
                question_id, option_letter, option_text, is_correct, order_index
              ) VALUES ($1, $2, $3, $4, $5)`,
              [
                qId,
                opt.option_letter || String.fromCharCode(65 + j),
                opt.option_text || '',
                Boolean(opt.is_correct),
                j,
              ]
            );
          }
        }
      }

      return { createdTest: created, testId: newTestId };
    });

    await logActivity(user.id, 'test_created', {
      test_id: testId,
      title: createdTest.title,
      question_count: normalizedQuestions.length,
      mode: createdTest.exam_mode,
      status: createdTest.status,
    });

    return NextResponse.json({
      success: true,
      testId,
      message: `Test "${createdTest.title}" successfully saved with ${normalizedQuestions.length} questions!`,
    });
  } catch (error: any) {
    console.error('Create test error:', error);
    const safeError = sanitizeDbErrorMessage(error);
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

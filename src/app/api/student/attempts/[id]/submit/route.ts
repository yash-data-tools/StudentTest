import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query, saveSingleStudentResponse } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { answers, time_spent_seconds, is_auto_submitted } = body;

    // 1. Fetch attempt and verify student ownership
    const attemptRes = await query(
      `SELECT * FROM test_attempts WHERE id = $1 AND student_id = $2`,
      [attemptId, user.id]
    );

    if (attemptRes.rowCount === 0) {
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
    }
    const attempt = attemptRes.rows[0];

    // 2. Fetch associated test
    const testRes = await query(`SELECT * FROM tests WHERE id = $1`, [attempt.test_id]);
    if (testRes.rowCount === 0) {
      return NextResponse.json({ error: 'Associated test not found' }, { status: 404 });
    }
    const test = testRes.rows[0];

    // 3. Fetch questions and options
    const questionsRes = await query(
      `SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index ASC`,
      [test.id]
    );
    const questions = questionsRes.rows;

    const questionIds = questions.map((q: any) => q.id);
    let options: any[] = [];
    if (questionIds.length > 0) {
      const optionsRes = await query(
        `SELECT * FROM question_options WHERE question_id = ANY($1::uuid[]) ORDER BY order_index ASC`,
        [questionIds]
      );
      options = optionsRes.rows;
    }

    // 4. Save any pending student answers
    if (answers && typeof answers === 'object') {
      for (const qId of Object.keys(answers)) {
        const ans = answers[qId];
        await saveSingleStudentResponse(attemptId, qId, {
          selected_options: ans.selected_options,
          numerical_response: ans.numerical_response,
          text_response: ans.text_response,
          is_visited: ans.is_visited ?? true,
          is_marked_for_review: ans.is_marked_for_review ?? false,
          is_answered: ans.is_answered ?? false,
        });
      }
    }

    // Fetch updated responses
    const responsesRes = await query(
      `SELECT * FROM student_responses WHERE attempt_id = $1`,
      [attemptId]
    );
    const savedResponses = responsesRes.rows;

    // 5. Automatic Evaluation Engine
    let academicScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    for (const q of questions) {
      const resp = savedResponses.find((r: any) => r.question_id === q.id);
      const qMarks = Number(q.marks) || 1;
      const qNegMarks = Number(q.negative_marks) || 0;

      if (!resp || !resp.is_answered) {
        unattemptedCount++;
        if (resp) {
          await query(
            `UPDATE student_responses SET marks_awarded = 0, is_correct = null, updated_at = NOW() WHERE id = $1`,
            [resp.id]
          );
        }
        continue;
      }

      // Single Correct MCQ, True/False & Assertion-Reason
      if (
        q.question_type === 'mcq_single' ||
        q.question_type === 'true_false' ||
        q.question_type === 'assertion_reason'
      ) {
        const correctOpt = options.find((o: any) => o.question_id === q.id && o.is_correct);
        let studentSelected = resp.selected_options;
        if (typeof studentSelected === 'string') {
          try {
            studentSelected = JSON.parse(studentSelected);
          } catch {
            // keep as string
          }
        }
        const selectedLetter = Array.isArray(studentSelected) ? studentSelected[0] : studentSelected;

        if (
          correctOpt &&
          selectedLetter &&
          String(selectedLetter).toUpperCase() === String(correctOpt.option_letter).toUpperCase()
        ) {
          academicScore += qMarks;
          correctCount++;
          await query(
            `UPDATE student_responses SET is_correct = true, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [qMarks, resp.id]
          );
        } else {
          academicScore -= qNegMarks;
          wrongCount++;
          await query(
            `UPDATE student_responses SET is_correct = false, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [-qNegMarks, resp.id]
          );
        }
      }
      // Multiple Correct MCQ
      else if (q.question_type === 'mcq_multiple') {
        const correctLetters = options
          .filter((o: any) => o.question_id === q.id && o.is_correct)
          .map((o: any) => o.option_letter.toUpperCase())
          .sort();

        let studentLetters: string[] = [];
        let rawSelected = resp.selected_options;
        if (typeof rawSelected === 'string') {
          try {
            rawSelected = JSON.parse(rawSelected);
          } catch {
            // raw string
          }
        }
        if (Array.isArray(rawSelected)) {
          studentLetters = rawSelected.map((s: any) => String(s).toUpperCase()).sort();
        } else if (rawSelected) {
          studentLetters = [String(rawSelected).toUpperCase()];
        }

        const isExact = JSON.stringify(correctLetters) === JSON.stringify(studentLetters);
        if (isExact) {
          academicScore += qMarks;
          correctCount++;
          await query(
            `UPDATE student_responses SET is_correct = true, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [qMarks, resp.id]
          );
        } else {
          academicScore -= qNegMarks;
          wrongCount++;
          await query(
            `UPDATE student_responses SET is_correct = false, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [-qNegMarks, resp.id]
          );
        }
      }
      // Numerical
      else if (q.question_type === 'numerical') {
        const studentNum = Number(resp.numerical_response);
        const targetNum = Number(q.numerical_answer);
        const tolerance = Number(q.numerical_tolerance) || 0;

        let isCorrect = false;
        if (!isNaN(studentNum) && !isNaN(targetNum)) {
          if (q.numerical_tolerance_type === 'range') {
            const min = Number(q.numerical_range_min ?? targetNum - tolerance);
            const max = Number(q.numerical_range_max ?? targetNum + tolerance);
            isCorrect = studentNum >= min && studentNum <= max;
          } else {
            isCorrect = Math.abs(studentNum - targetNum) <= tolerance;
          }
        }

        if (isCorrect) {
          academicScore += qMarks;
          correctCount++;
          await query(
            `UPDATE student_responses SET is_correct = true, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [qMarks, resp.id]
          );
        } else {
          academicScore -= qNegMarks;
          wrongCount++;
          await query(
            `UPDATE student_responses SET is_correct = false, marks_awarded = $1, updated_at = NOW() WHERE id = $2`,
            [-qNegMarks, resp.id]
          );
        }
      }
      // Descriptive / Handwritten / Derivation (Held for Teacher Review)
      else {
        await query(
          `UPDATE student_responses SET is_correct = null, marks_awarded = 0, updated_at = NOW() WHERE id = $1`,
          [resp.id]
        );
      }
    }

    const boundedAcademicScore = Math.max(0, academicScore);
    const totalMarks = Number(test.total_marks) || 1;
    const percentage = Math.round((boundedAcademicScore / totalMarks) * 100);

    const isQuickTest = test.exam_mode === 'instant_quick_test';
    const newStatus = isQuickTest ? 'evaluated' : 'pending_review';
    const finalScore = isQuickTest ? boundedAcademicScore : 0;

    await query(
      `UPDATE test_attempts
       SET time_spent_seconds = $1,
           submitted_at = NOW(),
           is_auto_submitted = $2,
           provisional_academic_score = $3,
           percentage = $4,
           status = $5,
           final_score = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        Number(time_spent_seconds) || 0,
        Boolean(is_auto_submitted),
        boundedAcademicScore,
        percentage,
        newStatus,
        finalScore,
        attemptId,
      ]
    );

    await logActivity(user.id, is_auto_submitted ? 'auto_submitted' : 'test_submitted', {
      test_id: test.id,
      attempt_id: attempt.id,
      exam_mode: test.exam_mode,
      score: boundedAcademicScore,
      percentage,
      time_spent: Number(time_spent_seconds) || 0,
    });

    const redirectUrl = isQuickTest
      ? `/student/results/${attempt.id}`
      : `/student/submitted?attempt_id=${attempt.id}`;

    return NextResponse.json({
      success: true,
      redirect: redirectUrl,
      mode: test.exam_mode,
      isQuickTest,
      stats: {
        score: boundedAcademicScore,
        totalMarks,
        percentage,
        correctCount,
        wrongCount,
        unattemptedCount,
      },
    });
  } catch (error: any) {
    console.error('Submit test error:', error);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { readLocalDB, writeLocalDB, saveSingleStudentResponse } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { answers, time_spent_seconds, is_auto_submitted } = body;

    const db = readLocalDB();
    const attempt = db.test_attempts.find(a => a.id === attemptId && a.student_id === user.id);
    if (!attempt) {
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
    }

    const test = db.tests.find(t => t.id === attempt.test_id);
    if (!test) {
      return NextResponse.json({ error: 'Associated test not found' }, { status: 404 });
    }

    const questions = db.questions.filter(q => q.test_id === test.id);
    const options = db.question_options.filter(o => questions.some(q => q.id === o.question_id));

    // Save all student answers
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

    // -------------------------------------------------------------
    // AUTOMATIC EVALUATION ENGINE (Phase 5 Integrated)
    // -------------------------------------------------------------
    let academicScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    for (const q of questions) {
      const resp = db.student_responses.find(r => r.attempt_id === attemptId && r.question_id === q.id);
      const qMarks = Number(q.marks) || 1;
      const qNegMarks = Number(q.negative_marks) || 0;

      if (!resp || !resp.is_answered) {
        unattemptedCount++;
        if (resp) resp.marks_awarded = 0;
        continue;
      }

      // 1. Single Correct MCQ, True/False & Assertion-Reason
      if (
        q.question_type === 'mcq_single' ||
        q.question_type === 'true_false' ||
        q.question_type === 'assertion_reason'
      ) {
        const correctOpt = options.find(o => o.question_id === q.id && o.is_correct);
        const studentSelected = resp.selected_options; // e.g. "A" or ["A"]
        const selectedLetter = Array.isArray(studentSelected) ? studentSelected[0] : studentSelected;

        if (correctOpt && selectedLetter && selectedLetter.toUpperCase() === correctOpt.option_letter.toUpperCase()) {
          academicScore += qMarks;
          resp.is_correct = true;
          resp.marks_awarded = qMarks;
          correctCount++;
        } else {
          academicScore -= qNegMarks;
          resp.is_correct = false;
          resp.marks_awarded = -qNegMarks;
          wrongCount++;
        }
      }
      // 2. Multiple Correct MCQ
      else if (q.question_type === 'mcq_multiple') {
        const correctLetters = options
          .filter(o => o.question_id === q.id && o.is_correct)
          .map(o => o.option_letter.toUpperCase())
          .sort();
        const studentLetters = (Array.isArray(resp.selected_options) ? resp.selected_options : [resp.selected_options])
          .map((s: string) => s?.toUpperCase())
          .filter(Boolean)
          .sort();

        const isExact = JSON.stringify(correctLetters) === JSON.stringify(studentLetters);
        if (isExact) {
          academicScore += qMarks;
          resp.is_correct = true;
          resp.marks_awarded = qMarks;
          correctCount++;
        } else {
          academicScore -= qNegMarks;
          resp.is_correct = false;
          resp.marks_awarded = -qNegMarks;
          wrongCount++;
        }
      }
      // 3. Numerical Value
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
          resp.is_correct = true;
          resp.marks_awarded = qMarks;
          correctCount++;
        } else {
          academicScore -= qNegMarks;
          resp.is_correct = false;
          resp.marks_awarded = -qNegMarks;
          wrongCount++;
        }
      }
      // 4. Descriptive / Handwritten Answers (Held for Teacher Review)
      else if (
        q.question_type === 'short_answer' ||
        q.question_type === 'long_answer' ||
        q.question_type === 'derivation' ||
        q.question_type === 'diagram' ||
        q.question_type === 'match_following'
      ) {
        // Will be evaluated in teacher review mode
        resp.is_correct = null;
        resp.marks_awarded = 0;
      }
    }

    // Ensure score doesn't drop below 0 unless negative scoring is explicitly unrestricted
    const boundedAcademicScore = Math.max(0, academicScore);
    const totalMarks = Number(test.total_marks) || 1;
    const percentage = Math.round((boundedAcademicScore / totalMarks) * 100);

    // Update Attempt Record
    attempt.time_spent_seconds = Number(time_spent_seconds) || 0;
    attempt.submitted_at = new Date().toISOString();
    attempt.is_auto_submitted = Boolean(is_auto_submitted);
    attempt.provisional_academic_score = boundedAcademicScore;
    attempt.percentage = percentage;

    // Check Exam Mode Routing:
    // Mode A: teacher_reviewed -> hold marks, send to pending_review
    // Mode B: instant_quick_test -> immediately finalize score
    const isQuickTest = test.exam_mode === 'instant_quick_test';
    attempt.status = isQuickTest ? 'evaluated' : 'pending_review';
    attempt.final_score = isQuickTest ? boundedAcademicScore : 0;
    attempt.updated_at = new Date().toISOString();

    writeLocalDB(db);

    await logActivity(user.id, is_auto_submitted ? 'auto_submitted' : 'test_submitted', {
      test_id: test.id,
      attempt_id: attempt.id,
      exam_mode: test.exam_mode,
      score: boundedAcademicScore,
      percentage,
      time_spent: attempt.time_spent_seconds,
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

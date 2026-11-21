import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;

    const attemptRes = await query(`SELECT * FROM test_attempts WHERE id = $1`, [attemptId]);
    if (attemptRes.rowCount === 0) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    const attempt = attemptRes.rows[0];

    const studentRes = await query(`SELECT id, real_name, username, school FROM users WHERE id = $1`, [
      attempt.student_id,
    ]);
    const student = studentRes.rows[0] || null;

    const testRes = await query(`SELECT * FROM tests WHERE id = $1`, [attempt.test_id]);
    const test = testRes.rows[0] || null;

    const questionsRes = await query(
      `SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index ASC`,
      [attempt.test_id]
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

    const responsesRes = await query(`SELECT * FROM student_responses WHERE attempt_id = $1`, [
      attempt.id,
    ]);
    const responses = responsesRes.rows;

    const attachmentsRes = await query(
      `SELECT * FROM answer_attachments WHERE attempt_id = $1 ORDER BY page_order ASC`,
      [attempt.id]
    );
    const attachments = attachmentsRes.rows;

    const integrityRes = await query(
      `SELECT * FROM integrity_events WHERE attempt_id = $1 ORDER BY timestamp ASC`,
      [attempt.id]
    );
    const integrityEvents = integrityRes.rows;

    const questionReviews = questions.map((q: any, idx: number) => {
      const resp = responses.find((r: any) => r.question_id === q.id);
      const qOptions = options.filter((o: any) => o.question_id === q.id);
      const correctOpt = qOptions.find((o: any) => o.is_correct);
      const qAttachments = attachments
        .filter((a: any) => a.question_id === q.id)
        .sort((a: any, b: any) => (a.page_order || 0) - (b.page_order || 0));

      return {
        question_id: q.id,
        question_number: idx + 1,
        question_text: q.question_text,
        question_type: q.question_type,
        max_marks: Number(q.marks) || 1,
        negative_marks: Number(q.negative_marks) || 0,
        options: qOptions,
        image_url: q.image_url,
        numerical_unit: q.numerical_unit,
        rubric: q.rubric,
        correct_answer: correctOpt
          ? `${correctOpt.option_letter}. ${correctOpt.option_text}`
          : q.numerical_answer !== null && q.numerical_answer !== undefined
          ? `Numerical Target: ${q.numerical_answer} (±${q.numerical_tolerance})`
          : 'Descriptive Rubric',
        explanation: q.explanation,
        student_response: {
          is_answered: resp ? Boolean(resp.is_answered) : qAttachments.length > 0,
          is_visited: resp ? Boolean(resp.is_visited) : false,
          selected_options: resp?.selected_options,
          numerical_response: resp?.numerical_response,
          text_response: resp?.text_response,
          attachments: qAttachments,
          is_correct: resp?.is_correct,
          ai_suggested_marks: Number(resp?.marks_awarded) || 0,
          ai_reasoning: resp?.is_correct
            ? 'Automated exact match evaluation.'
            : qAttachments.length > 0
            ? 'Handwritten solution attached for teacher review.'
            : resp?.text_response
            ? 'Typed answer submitted for teacher review.'
            : 'Unattempted.',
          teacher_override_marks:
            resp?.teacher_override_marks !== null && resp?.teacher_override_marks !== undefined
              ? Number(resp.teacher_override_marks)
              : Number(resp?.marks_awarded) || 0,
          teacher_feedback: resp?.teacher_feedback || '',
        },
      };
    });

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        time_spent_seconds: Number(attempt.time_spent_seconds) || 0,
        is_auto_submitted: attempt.is_auto_submitted,
        total_marks_possible: Number(attempt.total_marks_possible),
        provisional_academic_score: Number(attempt.provisional_academic_score),
        teacher_adjusted_score:
          attempt.teacher_adjusted_score !== null ? Number(attempt.teacher_adjusted_score) : null,
        integrity_deduction: Number(attempt.integrity_deduction) || 0,
        integrity_deduction_reason: attempt.integrity_deduction_reason || '',
        final_score: Number(attempt.final_score),
        percentage: Number(attempt.percentage),
      },
      student: {
        id: student?.id,
        real_name: student?.real_name,
        username: student?.username,
        school: student?.school,
      },
      test: {
        id: test?.id,
        title: test?.title,
        subject: test?.subject,
        chapter: test?.chapter,
        exam_mode: test?.exam_mode,
        duration_minutes: Number(test?.duration_minutes),
      },
      questions: questionReviews,
      integrity_events: integrityEvents,
    });
  } catch (error: any) {
    console.error('Fetch attempt review error:', error);
    return NextResponse.json({ error: 'Failed to fetch review details' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { question_marks, question_feedback, integrity_deduction, integrity_reason, action } =
      body;

    const attemptRes = await query(`SELECT * FROM test_attempts WHERE id = $1`, [attemptId]);
    if (attemptRes.rowCount === 0) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    const attempt = attemptRes.rows[0];

    let totalAcademicScore = 0;

    if (question_marks && typeof question_marks === 'object') {
      for (const qId of Object.keys(question_marks)) {
        const markVal = Number(question_marks[qId]) || 0;
        totalAcademicScore += markVal;

        const feedback =
          question_feedback && question_feedback[qId] !== undefined ? question_feedback[qId] : '';

        await query(
          `UPDATE student_responses
           SET teacher_override_marks = $1, marks_awarded = $1, teacher_feedback = $2, updated_at = NOW()
           WHERE attempt_id = $3 AND question_id = $4`,
          [markVal, feedback, attemptId, qId]
        );
      }
    } else {
      totalAcademicScore = Number(attempt.provisional_academic_score) || 0;
    }

    const deduction = Number(integrity_deduction) || 0;
    const finalScore = Math.max(0, totalAcademicScore - deduction);
    const maxMarks = Number(attempt.total_marks_possible) || 1;
    const finalPercentage = Math.round((finalScore / maxMarks) * 100);

    const newStatus = action === 'publish' ? 'published' : attempt.status;

    await query(
      `UPDATE test_attempts
       SET teacher_adjusted_score = $1,
           integrity_deduction = $2,
           final_score = $3,
           percentage = $4,
           status = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [totalAcademicScore, deduction, finalScore, finalPercentage, newStatus, attemptId]
    );

    if (action === 'publish') {
      await logActivity(user.id, 'test_result_published', {
        attempt_id: attempt.id,
        student_id: attempt.student_id,
        final_score: finalScore,
        integrity_deduction: deduction,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'publish'
          ? 'Exam review finalized and scorecard released to student!'
          : 'Review draft saved successfully.',
      finalScore,
      percentage: finalPercentage,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Update attempt review error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

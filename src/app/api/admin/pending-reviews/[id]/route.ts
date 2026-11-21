import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { readLocalDB, writeLocalDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const db = readLocalDB();

    const attempt = db.test_attempts.find(a => a.id === attemptId);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const student = db.users.find(u => u.id === attempt.student_id);
    const test = db.tests.find(t => t.id === attempt.test_id);
    const questions = db.questions
      .filter(q => q.test_id === attempt.test_id)
      .sort((a, b) => a.order_index - b.order_index);
    const options = db.question_options.filter(o => questions.some(q => q.id === o.question_id));
    const responses = db.student_responses.filter(r => r.attempt_id === attempt.id);
    const attachments = (db.answer_attachments || []).filter(a => a.attempt_id === attempt.id);
    const integrityEvents = db.integrity_events
      .filter(e => e.attempt_id === attempt.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Assemble rich question-by-question review items
    const questionReviews = questions.map((q, idx) => {
      const resp = responses.find(r => r.question_id === q.id);
      const qOptions = options.filter(o => o.question_id === q.id);
      const correctOpt = qOptions.find(o => o.is_correct);
      const qAttachments = attachments
        .filter(a => a.question_id === q.id)
        .sort((a, b) => (a.page_order || 0) - (b.page_order || 0));

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
        correct_answer: correctOpt ? `${correctOpt.option_letter}. ${correctOpt.option_text}` : (q.numerical_answer !== null ? `Numerical Target: ${q.numerical_answer} (±${q.numerical_tolerance})` : 'Descriptive Rubric'),
        explanation: q.explanation,
        // Student response details
        student_response: {
          is_answered: resp ? Boolean(resp.is_answered) : qAttachments.length > 0,
          is_visited: resp ? Boolean(resp.is_visited) : false,
          selected_options: resp?.selected_options,
          numerical_response: resp?.numerical_response,
          text_response: resp?.text_response,
          attachments: qAttachments,
          is_correct: resp?.is_correct,
          ai_suggested_marks: resp?.marks_awarded ?? 0,
          ai_reasoning: resp?.is_correct ? 'Automated exact match evaluation.' : qAttachments.length > 0 ? 'Handwritten solution attached for teacher review.' : (resp?.text_response ? 'Typed answer submitted for teacher review.' : 'Unattempted.'),
          teacher_override_marks: resp?.teacher_override_marks !== undefined ? resp.teacher_override_marks : resp?.marks_awarded ?? 0,
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
        time_spent_seconds: attempt.time_spent_seconds,
        is_auto_submitted: attempt.is_auto_submitted,
        total_marks_possible: attempt.total_marks_possible,
        provisional_academic_score: attempt.provisional_academic_score,
        teacher_adjusted_score: attempt.teacher_adjusted_score,
        integrity_deduction: attempt.integrity_deduction || 0,
        integrity_deduction_reason: attempt.integrity_deduction_reason || '',
        final_score: attempt.final_score,
        percentage: attempt.percentage,
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
        duration_minutes: test?.duration_minutes,
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
    const { question_marks, question_feedback, integrity_deduction, integrity_reason, action } = body;

    const db = readLocalDB();
    const attempt = db.test_attempts.find(a => a.id === attemptId);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Update individual question marks and feedback
    let totalAcademicScore = 0;

    if (question_marks && typeof question_marks === 'object') {
      for (const qId of Object.keys(question_marks)) {
        const markVal = Number(question_marks[qId]);
        totalAcademicScore += markVal;

        let resp = db.student_responses.find(r => r.attempt_id === attemptId && r.question_id === qId);
        if (resp) {
          resp.teacher_override_marks = markVal;
          resp.marks_awarded = markVal;
          if (question_feedback && question_feedback[qId] !== undefined) {
            resp.teacher_feedback = question_feedback[qId];
          }
          resp.updated_at = new Date().toISOString();
        }
      }
    } else {
      totalAcademicScore = Number(attempt.provisional_academic_score) || 0;
    }

    const deduction = Number(integrity_deduction) || 0;
    const finalScore = Math.max(0, totalAcademicScore - deduction);
    const maxMarks = Number(attempt.total_marks_possible) || 1;
    const finalPercentage = Math.round((finalScore / maxMarks) * 100);

    attempt.teacher_adjusted_score = totalAcademicScore;
    attempt.integrity_deduction = deduction;
    attempt.integrity_deduction_reason = integrity_reason || '';
    attempt.final_score = finalScore;
    attempt.percentage = finalPercentage;

    if (action === 'publish') {
      attempt.status = 'published';
      await logActivity(user.id, 'test_result_published', {
        attempt_id: attempt.id,
        student_id: attempt.student_id,
        final_score: finalScore,
        integrity_deduction: deduction,
      });
    }

    attempt.updated_at = new Date().toISOString();
    writeLocalDB(db);

    return NextResponse.json({
      success: true,
      message: action === 'publish' ? 'Exam review finalized and scorecard released to student!' : 'Review draft saved successfully.',
      finalScore,
      percentage: finalPercentage,
      status: attempt.status,
    });
  } catch (error: any) {
    console.error('Update attempt review error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

import { getCurrentUser } from '@/lib/auth';
import { readLocalDB } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

export default async function StudentResultScorecardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'student') {
    redirect('/login');
  }

  const db = readLocalDB();
  const attempt = db.test_attempts.find(a => a.id === attemptId && a.student_id === user.id);
  if (!attempt) {
    redirect('/student/dashboard');
  }

  const test = db.tests.find(t => t.id === attempt.test_id);
  const questions = db.questions
    .filter(q => q.test_id === attempt.test_id)
    .sort((a, b) => a.order_index - b.order_index);
  const options = db.question_options.filter(o => questions.some(q => q.id === o.question_id));
  const responses = db.student_responses.filter(r => r.attempt_id === attempt.id);
  const attachments = (db.answer_attachments || []).filter(a => a.attempt_id === attempt.id);

  // If teacher reviewed exam is not yet published by teacher, redirect to submitted notice
  if (test?.exam_mode === 'teacher_reviewed' && attempt.status !== 'published') {
    redirect(`/student/submitted?attempt_id=${attempt.id}`);
  }

  // Calculate statistics
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  questions.forEach(q => {
    const r = responses.find(resp => resp.question_id === q.id);
    if (!r || !r.is_answered) {
      unattemptedCount++;
    } else if (r.is_correct) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const accuracy = (correctCount + wrongCount) > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
  const minutesSpent = Math.floor((attempt.time_spent_seconds || 0) / 60);
  const secondsSpent = (attempt.time_spent_seconds || 0) % 60;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <span className="text-xs font-bold text-slate-500">
            Exam Date: {new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Scorecard Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                {test?.exam_mode === 'instant_quick_test' ? 'Instant AI Quick Test Result' : 'Teacher-Reviewed Official Result'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">{test?.title}</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">
                Student: <span className="text-white font-bold">{user.real_name}</span> &bull; {user.school}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center min-w-[140px]">
              <p className="text-xs uppercase tracking-wider text-blue-200 font-bold">Marks Scored</p>
              <p className="text-3xl sm:text-4xl font-black mt-1">
                {attempt.final_score} <span className="text-sm font-semibold text-blue-200">/ {attempt.total_marks_possible}</span>
              </p>
              <p className="text-xs font-bold text-emerald-300 mt-1">{attempt.percentage}% Percentage</p>
            </div>
          </div>
        </div>

        {/* Breakdown Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] uppercase font-bold text-slate-400">Correct</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">{correctCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] uppercase font-bold text-slate-400">Incorrect</span>
            <p className="text-xl font-black text-rose-600 mt-0.5">{wrongCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] uppercase font-bold text-slate-400">Accuracy</span>
            <p className="text-xl font-black text-blue-600 mt-0.5">{accuracy}%</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="text-[11px] uppercase font-bold text-slate-400">Time Spent</span>
            <p className="text-xl font-black text-slate-800 mt-0.5">{minutesSpent}m {secondsSpent}s</p>
          </div>
        </div>

        {/* Integrity Adjustment notice if teacher made any deduction */}
        {Number(attempt.integrity_deduction) > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Teacher Integrity Adjustment Applied</p>
                <p className="text-[11px] text-amber-700">
                  Academic Score: {attempt.provisional_academic_score} &bull; Integrity Deduction: -{attempt.integrity_deduction} marks
                </p>
              </div>
            </div>
            <span className="font-extrabold text-sm">{attempt.final_score} Marks</span>
          </div>
        )}

        {/* Detailed Question Review */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Question-by-Question Solution Review</h2>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const r = responses.find(resp => resp.question_id === q.id);
              const qOptions = options.filter(o => o.question_id === q.id);
              const correctOpt = qOptions.find(o => o.is_correct);

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border-2 space-y-3 ${
                    !r || !r.is_answered
                      ? 'border-slate-200 bg-slate-50/50'
                      : r.is_correct
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-red-300 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Question {idx + 1}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        !r || !r.is_answered
                          ? 'bg-slate-200 text-slate-700'
                          : r.is_correct
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {!r || !r.is_answered ? 'Unattempted (0M)' : r.is_correct ? `+${r.marks_awarded} Marks` : `${r.marks_awarded} Marks`}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-900">{q.question_text}</p>

                  {/* Options review */}
                  {qOptions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {qOptions.map(opt => {
                        const isStudentPick = r?.selected_options === opt.option_letter || (Array.isArray(r?.selected_options) && r?.selected_options.includes(opt.option_letter));
                        const isRight = opt.is_correct;

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              isRight
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                                : isStudentPick
                                ? 'bg-red-50 border-red-400 text-red-950 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold">({opt.option_letter})</span>
                              <span>{opt.option_text}</span>
                            </div>
                            <div>
                              {isRight && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Correct</span>}
                              {!isRight && isStudentPick && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">Your Choice</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical Answer Review */}
                  {q.question_type === 'numerical' && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <p className="text-slate-600">Your Answer: <span className="font-bold text-slate-900">{r?.numerical_response ?? 'None'}</span></p>
                      <p className="text-emerald-700 font-bold">Correct Target Answer: {q.numerical_answer} (Tolerance: ±{q.numerical_tolerance})</p>
                    </div>
                  )}

                  {/* Written & Typed Answer Review */}
                  {r?.text_response && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-slate-700 text-[10px] uppercase">Your Typed Answer:</p>
                      <p className="text-slate-900 whitespace-pre-wrap">{r.text_response}</p>
                    </div>
                  )}

                  {/* Submitted Handwritten Pages Review */}
                  {attachments.filter(a => a.question_id === q.id).length > 0 && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-2">
                      <p className="font-bold text-indigo-950 text-[10px] uppercase">Your Submitted Handwritten Notebook Pages:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {attachments
                          .filter(a => a.question_id === q.id)
                          .sort((a, b) => (a.page_order || 0) - (b.page_order || 0))
                          .map((att, attIdx) => (
                            <a
                              key={att.id}
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg overflow-hidden border border-indigo-200 bg-white p-1 block hover:border-indigo-500 transition-colors"
                            >
                              <span className="text-[10px] font-bold text-indigo-700 block mb-1">Page {att.page_order || attIdx + 1}</span>
                              <div className="h-20 rounded overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={att.file_url} alt="Notebook Page" className="w-full h-full object-cover" />
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {r?.teacher_feedback && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                      <p className="font-bold text-amber-900 text-[10px] uppercase">Teacher Feedback:</p>
                      <p className="text-amber-950 mt-0.5">{r.teacher_feedback}</p>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="pt-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-700 uppercase text-[10px]">Explanation / Solution:</p>
                      <p className="mt-0.5">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

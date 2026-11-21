'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Save,
  Send,
  User,
  GraduationCap,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Loader2,
  Check,
  X,
  Eye,
} from 'lucide-react';

export default function TeacherReviewPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable states
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [integrityDeduction, setIntegrityDeduction] = useState<number>(0);
  const [integrityReason, setIntegrityReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadReview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/pending-reviews/${attemptId}`);
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to load attempt.');

        setData(resData);
        setIntegrityDeduction(resData.attempt.integrity_deduction || 0);
        setIntegrityReason(resData.attempt.integrity_deduction_reason || '');

        // Initialize marks and feedback from questions
        const initialMarks: Record<string, number> = {};
        const initialFeedback: Record<string, string> = {};
        resData.questions.forEach((q: any) => {
          initialMarks[q.question_id] = q.student_response.teacher_override_marks ?? q.student_response.ai_suggested_marks ?? 0;
          initialFeedback[q.question_id] = q.student_response.teacher_feedback || '';
        });
        setMarks(initialMarks);
        setFeedback(initialFeedback);
      } catch (err: any) {
        setError(err.message || 'Error loading review.');
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [attemptId]);

  // Handle Mark Change
  const handleMarkChange = (qId: string, val: number, maxMarks: number) => {
    // Prevent exceeding max marks
    const clamped = Math.max(0, Math.min(val, maxMarks));
    setMarks((prev) => ({ ...prev, [qId]: clamped }));
  };

  // Recalculate Live Academic Score
  const currentAcademicScore = Object.values(marks).reduce((sum, m) => sum + (Number(m) || 0), 0);
  const finalScore = Math.max(0, currentAcademicScore - (Number(integrityDeduction) || 0));
  const maxPossible = data?.attempt?.total_marks_possible || 1;
  const currentPercentage = Math.round((finalScore / maxPossible) * 100);

  // Save / Publish Action
  const handleSaveOrPublish = async (action: 'draft' | 'publish') => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/pending-reviews/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_marks: marks,
          question_feedback: feedback,
          integrity_deduction: integrityDeduction,
          integrity_reason: integrityReason,
          action,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to save review.');

      setMessage({ type: 'success', text: resJson.message });
      if (action === 'publish') {
        setTimeout(() => {
          router.push('/admin/pending-reviews');
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs">Loading submission paper & AI marks...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Unable to Load Review</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/admin/pending-reviews" className="text-xs font-bold text-indigo-600 underline">
          &larr; Back to Pending Reviews
        </Link>
      </div>
    );
  }

  const { student, test, attempt, questions, integrity_events } = data;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/pending-reviews"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submissions
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveOrPublish('draft')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Save Draft
          </button>
          <button
            onClick={() => handleSaveOrPublish('publish')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {saving ? 'Publishing...' : 'Finalize & Publish to Student'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2 text-xs sm:text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* TOP SUMMARY CARD (Section 10 Requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Teacher Review Mode &bull; {test.exam_mode}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">{test.title}</h1>
            <p className="text-xs text-slate-600">
              Student: <span className="font-bold text-slate-900">{student.real_name}</span> &bull; @{student.username} &bull; {student.school}
            </p>
            <p className="text-[11px] text-slate-400">
              Submitted: {new Date(attempt.submitted_at || attempt.started_at).toLocaleString()} &bull; Time Spent: {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
            </p>
          </div>

          {/* AI vs Teacher Scoreboard */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Provisional AI Score</p>
            <p className="text-2xl font-black text-slate-700 mt-0.5">
              {attempt.provisional_academic_score} <span className="text-xs font-normal">/ {attempt.total_marks_possible}</span>
            </p>
            <p className="text-[11px] text-slate-400">AI automated check</p>
          </div>

          <div className="p-4 bg-indigo-50/70 rounded-xl border-2 border-indigo-400 text-center">
            <p className="text-[10px] font-bold uppercase text-indigo-700">Teacher Final Score</p>
            <p className="text-2xl font-black text-indigo-950 mt-0.5">
              {finalScore} <span className="text-xs font-normal text-indigo-700">/ {attempt.total_marks_possible}</span>
            </p>
            <p className="text-[11px] font-bold text-indigo-700">{currentPercentage}% Scorecard</p>
          </div>
        </div>

        {/* Integrity Adjustment Section (Section 18) */}
        <div className="mt-6 pt-5 border-t border-slate-100 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold uppercase text-amber-900">Teacher Integrity Adjustment (Separate from academic marks)</h3>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            If suspicious browser activity occurred, you may apply a manual mark deduction with an audit reason. The audit trail preserves original academic score vs integrity penalty.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Integrity Mark Deduction</label>
              <input
                type="number"
                min={0}
                max={currentAcademicScore}
                value={integrityDeduction}
                onChange={(e) => setIntegrityDeduction(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-red-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Deduction Reason / Notes</label>
              <input
                type="text"
                placeholder="e.g. Repeated tab focus loss during exam duration"
                value={integrityReason}
                onChange={(e) => setIntegrityReason(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION-BY-QUESTION REVIEW CARDS */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Question-by-Question Grading & Overrides</h2>
          <span className="text-xs text-slate-500">{questions.length} questions in examination</span>
        </div>

        {questions.map((q: any) => {
          const resp = q.student_response;
          const currentAwarded = marks[q.question_id] ?? 0;

          return (
            <div key={q.question_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                    Q{q.question_number}
                  </span>
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    {q.question_type.replace('_', ' ')} &bull; Max: {q.max_marks} Marks
                  </span>
                </div>

                {/* Teacher Marks Input Box (Section 10) */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">AI Awarded</span>
                    <span className="text-xs font-bold text-slate-600">{resp.ai_suggested_marks} / {q.max_marks}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                    <label className="text-xs font-bold text-indigo-700">Final Marks:</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={q.max_marks}
                      value={currentAwarded}
                      onChange={(e) => handleMarkChange(q.question_id, parseFloat(e.target.value) || 0, q.max_marks)}
                      className="w-16 px-2.5 py-1 bg-indigo-50 border border-indigo-300 rounded-lg text-center font-black text-indigo-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-bold">/ {q.max_marks}</span>
                  </div>
                </div>
              </div>

              {/* Question Statement */}
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                {q.question_text}
              </p>

              {/* Student Actual Answer vs Correct Answer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Student Answer</span>
                  <p className="font-bold text-slate-800">
                    {resp.selected_options
                      ? `Option ${resp.selected_options}`
                      : resp.numerical_response !== null && resp.numerical_response !== undefined
                      ? `Value: ${resp.numerical_response}`
                      : resp.text_response
                      ? resp.text_response
                      : 'Unattempted'}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-1">Correct Key / Solution</span>
                  <p className="font-bold text-emerald-950">{q.correct_answer}</p>
                </div>
              </div>

              {/* AI Explanation & Feedback */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">AI Marking Rationale: </span>
                  <span>{resp.ai_reasoning}</span>
                </div>
              </div>

              {/* Teacher Feedback Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Teacher Feedback for Student</label>
                <input
                  type="text"
                  placeholder="Add constructive feedback or marking note for the student..."
                  value={feedback[q.question_id] || ''}
                  onChange={(e) => setFeedback({ ...feedback, [q.question_id]: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* SUSPICIOUS ACTIVITY TIMELINE (Section 17) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Exam Integrity Event Timeline</h2>
          <span className="text-xs text-slate-400">({integrity_events.length} events logged during attempt)</span>
        </div>

        {integrity_events.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl">
            No unusual browser activity detected during this exam attempt.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {integrity_events.map((evt: any) => (
              <div key={evt.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-800">{evt.event_type.replace(/_/g, ' ')}</span>
                  {evt.duration_seconds > 0 && (
                    <span className="text-slate-400">({evt.duration_seconds}s duration)</span>
                  )}
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

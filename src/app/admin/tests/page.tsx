'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  FileUp,
  Sparkles,
  Clock,
  Award,
  CheckCircle,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  PauseCircle,
  PlayCircle,
  Sliders,
  X,
} from 'lucide-react';

interface ExamTest {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  total_marks: number;
  duration_minutes: number;
  exam_mode: string;
  status: string;
  question_count: number;
  total_attempts: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export default function TestManagementPage() {
  const [tests, setTests] = useState<ExamTest[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule modal state
  const [selectedTest, setSelectedTest] = useState<ExamTest | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tests');
      const data = await res.json();
      if (data.success) {
        setTests(data.tests);
      }
    } catch (err) {
      console.error('Failed to load tests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Quick action: Toggle Stop/Active status
  const toggleTestStatus = async (test: ExamTest) => {
    const nextStatus = test.status === 'closed' ? 'published' : 'closed';
    try {
      const res = await fetch(`/api/admin/tests/${test.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchTests();
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Schedule Save
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    setSavingAction(true);

    try {
      const res = await fetch(`/api/admin/tests/${selectedTest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startTime ? new Date(startTime).toISOString() : null,
          end_date: endTime ? new Date(endTime).toISOString() : null,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        fetchTests();
      }
    } catch {
      alert('Failed to save schedule');
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? All questions and student attempts for it will be removed.')) return;

    try {
      const res = await fetch(`/api/admin/tests/${testId}`, { method: 'DELETE' });
      if (res.ok) fetchTests();
    } catch {
      alert('Failed to delete test');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Test Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete tutor control: stop active exams, schedule start/closing timers, and inspect who attempted and their marks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pdf-to-test"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <FileUp className="w-4 h-4" />
            PDF to Test
          </Link>
          <Link
            href="/admin/ai-quick-test"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Quick Test
          </Link>
        </div>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Tests Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Upload a question paper PDF or synthesize a custom AI test to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => {
            const isClosed = test.status === 'closed';

            return (
              <div
                key={test.id}
                className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all flex flex-col justify-between ${
                  isClosed ? 'border-red-200 bg-red-50/20' : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        test.exam_mode === 'teacher_reviewed'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {test.exam_mode === 'teacher_reviewed' ? 'Teacher-Reviewed (50M)' : 'Instant Quick (10M)'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isClosed
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isClosed ? 'STOPPED / CLOSED' : 'ACTIVE / OPEN'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{test.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {test.subject} {test.chapter ? `&bull; ${test.chapter}` : ''}
                  </p>

                  {/* Scheduled Times if configured */}
                  {(test.start_date || test.end_date) && (
                    <div className="mt-2 text-[10px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg border border-indigo-200 space-y-0.5 font-mono">
                      {test.start_date && (
                        <p>Starts: {new Date(test.start_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                      )}
                      {test.end_date && (
                        <p>Closes: {new Date(test.end_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Marks</p>
                      <p className="font-extrabold text-slate-900">{test.total_marks}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Questions</p>
                      <p className="font-extrabold text-slate-900">{test.question_count}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Duration</p>
                      <p className="font-extrabold text-slate-900">{test.duration_minutes}m</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2.5">
                  {/* VIEW SUBMISSIONS & MARKS (Full user request requirement) */}
                  <Link
                    href={`/admin/tests/${test.id}/attempts`}
                    className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-blue-200 shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>View Student Submissions &amp; Scores ({test.total_attempts})</span>
                  </Link>

                  {/* ADMIN CONTROL BUTTONS: Stop Exam & Schedule Start/End Timer */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      onClick={() => toggleTestStatus(test)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                        isClosed
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                      }`}
                    >
                      {isClosed ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                      <span>{isClosed ? 'Resume Exam' : 'Stop Exam'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTest(test);
                        setStartTime(test.start_date ? new Date(test.start_date).toISOString().slice(0, 16) : '');
                        setEndTime(test.end_date ? new Date(test.end_date).toISOString().slice(0, 16) : '');
                        setShowScheduleModal(true);
                      }}
                      className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Schedule</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE START & END TIME MODAL */}
      {showScheduleModal && selectedTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule Exam Timer</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4 pt-4 text-xs">
              <p className="text-slate-500">
                Exam: <span className="font-bold text-slate-900">{selectedTest.title}</span>
              </p>

              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">
                  Automated Start Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Students will see a countdown timer until this moment and cannot start early.
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">
                  Automated Close / Deadline Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  After this time, the exam automatically locks and prevents new attempts.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {savingAction ? 'Saving...' : 'Apply Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  History,
  User,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

interface TestItem {
  id: string;
  title: string;
  subject: string;
  chapter?: string;
  total_marks: number;
  duration_minutes: number;
  exam_mode: string;
  question_count: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  student_attempt_status: string;
  latest_attempt_id: string | null;
  latest_score: number | null;
  latest_percentage: number | null;
}

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<'tests' | 'results' | 'history' | 'profile'>('tests');
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/tests');
      const data = await res.json();
      if (data.success) {
        setTests(data.tests);
      }
    } catch (err) {
      console.error('Failed to load student tests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const completedTests = tests.filter(
    (t) => t.student_attempt_status === 'evaluated' || t.student_attempt_status === 'published'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Student Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">Smart Tuition</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Student Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Student Workspace */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Available Tests ({tests.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            My Scorecards ({completedTests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Test History
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            My Profile
          </button>
        </div>

        {/* TAB 1: AVAILABLE TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Interactive Examination Center
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-3">Welcome to your exam portal</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
                Take tests in full JEE-style interface with question palette, live countdown timer, and automatic progress saving.
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-xs border border-slate-200">
                Loading examination papers...
              </div>
            ) : tests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Tests Available Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your tutor hasn&apos;t published any examinations yet. As soon as a paper is published, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((test) => {
                  const isInProgress = test.student_attempt_status === 'in_progress';
                  const isPendingReview = test.student_attempt_status === 'pending_review' || test.student_attempt_status === 'submitted';
                  const isDone = test.student_attempt_status === 'evaluated' || test.student_attempt_status === 'published';
                  const isClosed = test.status === 'closed';
                  const now = Date.now();
                  const isFuture = test.start_date ? new Date(test.start_date).getTime() > now : false;
                  const isExpired = test.end_date ? new Date(test.end_date).getTime() < now : false;

                  return (
                    <div
                      key={test.id}
                      className={`bg-white rounded-2xl border-2 p-6 shadow-sm transition-all flex flex-col justify-between ${
                        isClosed ? 'border-slate-200 opacity-80' : 'border-slate-200 hover:border-blue-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                test.exam_mode === 'teacher_reviewed'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {test.exam_mode === 'teacher_reviewed' ? 'Teacher-Reviewed (50M)' : 'Instant Quick (10M)'}
                            </span>
                            {isClosed && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                Stopped / Closed
                              </span>
                            )}
                            {isFuture && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                Starts {new Date(test.start_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {isExpired && !isDone && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                Deadline Passed
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {test.duration_minutes} Mins
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{test.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {test.subject} {test.chapter ? `&bull; ${test.chapter}` : ''}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Marks</span>
                            <span className="font-extrabold text-slate-900">{test.total_marks} Marks</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Questions</span>
                            <span className="font-extrabold text-slate-900">{test.question_count} Items</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pattern</span>
                            <span className="font-extrabold text-slate-900">JEE Standard</span>
                          </div>
                        </div>

                        {(test.start_date || test.end_date) && (
                          <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                            {test.start_date && (
                              <p>
                                <span className="font-bold text-slate-600">Start Window:</span>{' '}
                                {new Date(test.start_date).toLocaleString()}
                              </p>
                            )}
                            {test.end_date && (
                              <p>
                                <span className="font-bold text-slate-600">Closes at:</span>{' '}
                                {new Date(test.end_date).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        {isDone ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Score: {test.latest_score} / {test.total_marks} ({test.latest_percentage}%)
                            </span>
                            <Link
                              href={`/student/results/${test.latest_attempt_id}`}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Scorecard
                            </Link>
                          </div>
                        ) : isPendingReview ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Submitted &bull; Awaiting Review
                            </span>
                            <Link
                              href={`/student/submitted?attempt_id=${test.latest_attempt_id}`}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                            >
                              Check Status
                            </Link>
                          </div>
                        ) : isClosed ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-red-500 font-semibold">
                              Exam stopped by tutor
                            </span>
                            <button
                              disabled
                              className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              Exam Closed
                            </button>
                          </div>
                        ) : isFuture ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-amber-600 font-semibold">
                              Scheduled Exam
                            </span>
                            <button
                              disabled
                              className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              Starts at {new Date(test.start_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          </div>
                        ) : isExpired ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-slate-400">
                              Deadline has passed
                            </span>
                            <button
                              disabled
                              className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              Window Closed
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-slate-400">
                              {isInProgress ? 'Attempt in progress' : 'Ready to start'}
                            </span>
                            <Link
                              href={`/student/exam/${test.id}`}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              {isInProgress ? 'Resume Exam' : 'Start Exam'}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY SCORECARDS */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">My Released Exam Scorecards</h2>
              <span className="text-xs text-slate-500">{completedTests.length} tests evaluated</span>
            </div>

            {completedTests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Published Scorecards Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Attempt an exam and submit it to see your marks, percentage, and detailed answer reviews here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTests.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 transition-colors"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{t.title}</h3>
                      <p className="text-xs text-slate-500">
                        {t.subject} &bull; Marks: {t.latest_score} / {t.total_marks} ({t.latest_percentage}%)
                      </p>
                    </div>
                    <Link
                      href={`/student/results/${t.latest_attempt_id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Solution
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TEST HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Complete Attempt History</h2>
            <div className="divide-y divide-slate-100 text-xs">
              {tests.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{t.title}</p>
                    <p className="text-[11px] text-slate-400">{t.subject} &bull; {t.duration_minutes} Mins</p>
                  </div>
                  <span className="font-bold capitalize text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {t.student_attempt_status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-xl mx-auto space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Profile</h3>
                <p className="text-xs text-slate-500">Academic account credentials and school details</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Role</span>
                <span className="font-bold text-blue-600 uppercase">Student</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Security Setting</span>
                <span className="font-bold text-emerald-600">Zero-Email Simple Login Active</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Test Integrity Protection</span>
                <span className="font-bold text-purple-600">Active</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

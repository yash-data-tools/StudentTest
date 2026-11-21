'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Award,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface AttemptData {
  id: string;
  student_id: string;
  student_name: string;
  username: string;
  school: string;
  status: string;
  total_marks_possible: number;
  provisional_academic_score: number;
  teacher_adjusted_score: number | null;
  integrity_deduction: number;
  final_score: number;
  percentage: number;
  time_spent_seconds: number;
  is_auto_submitted: boolean;
  suspicious_events_count: number;
  started_at: string;
  submitted_at: string | null;
}

export default function TestAttemptsListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: testId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttempts() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/tests/${testId}/attempts`);
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Failed to load test submissions.');
        setData(resData);
      } catch (err: any) {
        setError(err.message || 'Error loading attempts');
      } finally {
        setLoading(false);
      }
    }

    loadAttempts();
  }, [testId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs">Loading student submissions & scores...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Unable to Load Submissions</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/admin/tests" className="text-xs font-bold text-indigo-600 underline">
          &larr; Back to Tests
        </Link>
      </div>
    );
  }

  const { test, attempts }: { test: any; attempts: AttemptData[] } = data;

  const totalAttempts = attempts.length;
  const completed = attempts.filter((a) => a.status === 'published' || a.status === 'evaluated');
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((acc, curr) => acc + (Number(curr.final_score) || 0), 0) / completed.length)
      : 0;
  const highest =
    completed.length > 0 ? Math.max(...completed.map((a) => Number(a.final_score) || 0)) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Back button & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/tests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Test Management
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Submissions & Scorecard Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Exam: <span className="font-bold text-slate-800">{test.title}</span> ({test.subject}) &bull; Total Marks: {test.total_marks}
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
            test.status === 'published' || test.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          Status: {test.status}
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Students Attempted</p>
            <p className="text-2xl font-black text-slate-900">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Average Score</p>
            <p className="text-2xl font-black text-emerald-600">
              {avgScore} / {test.total_marks}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Top Score</p>
            <p className="text-2xl font-black text-purple-600">
              {highest} / {test.total_marks}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Student Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Student Attempts Breakdown</h2>
          <span className="text-xs text-slate-500">{attempts.length} attempts recorded</span>
        </div>

        {attempts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No students have attempted this examination yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Attempt Status</th>
                  <th className="py-3 px-4 text-center">Marks Scored</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Time Spent</th>
                  <th className="py-3 px-4 text-center">Integrity Flags</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attempts.map((attempt) => {
                  const minutes = Math.floor((attempt.time_spent_seconds || 0) / 60);
                  const seconds = (attempt.time_spent_seconds || 0) % 60;

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{attempt.student_name}</p>
                        <p className="text-[11px] text-slate-400">@{attempt.username}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{attempt.school || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            attempt.status === 'published' || attempt.status === 'evaluated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : attempt.status === 'pending_review'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {attempt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-sm text-slate-900">
                        {attempt.status === 'in_progress' ? (
                          <span className="text-slate-400">--</span>
                        ) : (
                          <span>
                            {attempt.final_score}{' '}
                            <span className="text-xs font-normal text-slate-400">/ {attempt.total_marks_possible}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {attempt.status === 'in_progress' ? (
                          <span className="text-slate-400">--</span>
                        ) : (
                          <span className="text-emerald-600">{attempt.percentage}%</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {minutes}m {seconds}s
                      </td>
                      <td className="py-3 px-4 text-center">
                        {attempt.suspicious_events_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <ShieldAlert className="w-3 h-3" />
                            {attempt.suspicious_events_count} events
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Clean</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/pending-reviews/${attempt.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Paper</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PendingReviewItem {
  id: string;
  student_id: string;
  student_name: string;
  username: string;
  school: string;
  test_title: string;
  exam_mode: string;
  status: string;
  total_marks_possible: number;
  provisional_academic_score: number;
  teacher_adjusted_score: number | null;
  integrity_deduction: number;
  final_score: number;
  percentage: number;
  suspicious_events_count: number;
  submitted_at: string;
}

export default function PendingReviewsListPage() {
  const [attempts, setAttempts] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pending-reviews');
      const data = await res.json();
      if (data.success) {
        setAttempts(data.attempts);
      }
    } catch (err) {
      console.error('Failed to load pending reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const pending = attempts.filter((a) => a.status === 'pending_review' || a.status === 'submitted');
  const published = attempts.filter((a) => a.status === 'published');

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Teacher Paper Reviews</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review student submissions for 50-mark tests, adjust question marks, apply integrity adjustments, and publish final scorecards.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs">Loading submissions queue...</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Submissions Awaiting Review</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            When students submit a Teacher-Reviewed examination (e.g. 50-mark test), it will automatically appear here for your moderation.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Review Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Awaiting Teacher Grading ({pending.length})
              </h2>
            </div>

            {pending.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">All submissions have been reviewed and published!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Exam Paper</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4 text-center">AI Provisional</th>
                      <th className="py-3 px-4 text-center">Suspicious Events</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pending.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{item.student_name}</p>
                          <p className="text-[11px] text-slate-400">@{item.username} &bull; {item.school}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.test_title}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(item.submitted_at).toLocaleDateString()} {new Date(item.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {item.provisional_academic_score} / {item.total_marks_possible}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.suspicious_events_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <ShieldAlert className="w-3 h-3" />
                              {item.suspicious_events_count} events
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/pending-reviews/${item.id}`}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors"
                          >
                            <span>Grade Paper</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Published Table */}
          {published.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Published Scorecards ({published.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Exam Paper</th>
                      <th className="py-3 px-4 text-center">Final Score</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {published.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{item.student_name}</p>
                          <p className="text-[11px] text-slate-400">@{item.username}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.test_title}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {item.final_score} / {item.total_marks_possible}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{item.percentage}%</td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/pending-reviews/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                          >
                            <span>Reopen / Edit</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

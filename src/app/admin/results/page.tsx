'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  TrendingUp,
  Users,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';

export default function ResultsAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch((err) => console.error('Failed to load analytics', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs">Computing performance analytics...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const dist = metrics.distribution || {};
  const integrity = data?.integrityOverview || {};
  const questionStats = data?.questionStats || [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Performance Results & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed metrics across student examination attempts, score distributions, and question difficulty.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total Attempts</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalAttempts || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all published tests</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400">Average Score</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.averagePercentage || 0}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Median: {metrics.medianPercentage || 0}%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400">Highest Score</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{metrics.highestScore || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Lowest: {metrics.lowestScore || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400">Integrity Events</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{integrity.totalIntegrityEvents || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">{integrity.tabSwitchEvents || 0} focus switches</p>
        </div>
      </div>

      {/* Score Distribution Chart & Integrity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Breakdown (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Student Performance Distribution
          </h2>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-emerald-700">Distinction (85% – 100%)</span>
                <span>{dist.excellent || 0} students</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${metrics.totalAttempts ? ((dist.excellent || 0) / metrics.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-blue-700">First Class (70% – 84%)</span>
                <span>{dist.good || 0} students</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${metrics.totalAttempts ? ((dist.good || 0) / metrics.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-amber-700">Pass (50% – 69%)</span>
                <span>{dist.average || 0} students</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${metrics.totalAttempts ? ((dist.average || 0) / metrics.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-rose-700">Needs Remedial (&lt; 50%)</span>
                <span>{dist.needsImprovement || 0} students</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${metrics.totalAttempts ? ((dist.needsImprovement || 0) / metrics.totalAttempts) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Integrity Deterrence Summary
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600">Tab / Window Switches:</span>
              <span className="font-bold text-slate-900">{integrity.tabSwitchEvents || 0}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600">Fullscreen Exits:</span>
              <span className="font-bold text-slate-900">{integrity.fullscreenExitEvents || 0}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600">Clipboard Interceptions:</span>
              <span className="font-bold text-slate-900">{integrity.clipboardEvents || 0}</span>
            </div>
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-900">
              <strong>Neutral Policy:</strong> Suspicious activity is recorded as an informational audit trail. Mark deductions are only made manually by the teacher during review.
            </div>
          </div>
        </div>
      </div>

      {/* Question Accuracy & Difficulty Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Question Difficulty & Accuracy Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Identifies questions where students struggle most frequently.</p>
        </div>

        {questionStats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No question performance data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Q#</th>
                  <th className="py-3 px-4">Question Text</th>
                  <th className="py-3 px-4 text-center">Responses</th>
                  <th className="py-3 px-4 text-center">Accuracy</th>
                  <th className="py-3 px-4 text-right">Difficulty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {questionStats.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">Q{q.question_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{q.question_text}</td>
                    <td className="py-3 px-4 text-center">{q.total_answers}</td>
                    <td className="py-3 px-4 text-center">
                      {q.accuracy_percentage !== null ? (
                        <span className="font-bold text-emerald-600">{q.accuracy_percentage}%</span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          q.difficulty_assessment === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.difficulty_assessment === 'Moderate'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : q.difficulty_assessment === 'Challenging'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {q.difficulty_assessment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

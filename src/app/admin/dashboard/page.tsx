import { getCurrentUser } from '@/lib/auth';
import { getDashboardMetrics, getActivityLogsList } from '@/lib/db';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  CheckCircle,
  FileUp,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  UserCheck,
  Activity,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const metrics = await getDashboardMetrics();
  const recentLogs = await getActivityLogsList({ limit: 5 });

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tutor Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{user?.real_name}</span> &bull; {user?.school || 'Tuition Academy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pdf-to-test"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <FileUp className="w-4 h-4" />
            PDF to Test
          </Link>
          <Link
            href="/admin/ai-quick-test"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Quick Test (10M)
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalStudents}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {metrics.activeStudents} active &bull; {metrics.pendingApprovalStudents} pending
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tests</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.publishedTests}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Online & ready</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Reviews</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{metrics.pendingReviews}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Requires teacher grading</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalAttempts}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Evaluated attempts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/admin/students"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Manage Students</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Add new students, reset forgotten passwords, manage account statuses, and export student rosters as JSON or CSV.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
            <span>View Student List</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/admin/pdf-to-test"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <FileUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">PDF to Interactive Test</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Upload question paper PDFs (standard or scanned OCR), extract questions with AI, and prepare 50-mark Teacher-Reviewed exams.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
            <span>Upload Question Paper</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/admin/ai-quick-test"
          className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-purple-500 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">AI Quick Test Generator</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Generate balanced 10-mark instant topic tests with automatic scoring and instant scorecard release for students.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
            <span>Generate 10M Test</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Recent Activity Log Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Live Audit & Activity Feed</h2>
          </div>
          <Link
            href="/admin/activity"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {log.student_name} <span className="font-normal text-slate-500">(@{log.username})</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Event: <span className="text-slate-700 font-semibold">{log.event_type}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

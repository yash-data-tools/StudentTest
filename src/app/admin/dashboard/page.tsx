import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import { Shield, Users, FileText, CheckSquare, Sparkles, Activity, Settings, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight">Smart Tuition Exam</span>
              <span className="ml-2 text-xs bg-indigo-900/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700">Tutor Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user.real_name}</p>
              <p className="text-[11px] text-slate-400">@{user.username} &bull; {user.school || 'Tuition Academy'}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
          <p className="text-slate-600 text-sm mt-1">
            Welcome back, {user.real_name}. System is initialized and ready for Phase 2 implementation.
          </p>
        </div>

        {/* Phase 1 Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Authentication</p>
              <p className="text-sm font-bold text-slate-900">Role: Administrator</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Security Mode</p>
              <p className="text-sm font-bold text-emerald-600">Secure Session Active</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Audit Logging</p>
              <p className="text-sm font-bold text-slate-900">Real-Time Enabled</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Phase 1 Status</p>
              <p className="text-sm font-bold text-amber-700">Completed & Verified</p>
            </div>
          </div>
        </div>

        {/* Next Features Teaser */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Phase 1 Architecture Deployed</h2>
          <p className="text-sm text-slate-600 mb-4">
            The foundation is fully active: Next.js App Router, PostgreSQL / Local Fallback Database Schema, Role-Based Route Middleware, Secure Bcrypt & JWT Cookie Authentication, and Admin/Student Separation.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Student Management</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>PDF to Test Extraction</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Quick Test (10 Marks)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Exam Integrity Monitor</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

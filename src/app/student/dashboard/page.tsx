import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import { GraduationCap, BookOpen, Clock, Award, History, CheckCircle2 } from 'lucide-react';

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'student') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Student Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">Smart Tuition</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">Student Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user.real_name}</p>
              <p className="text-[11px] text-slate-500">{user.school} &bull; @{user.username}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Student Workspace */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide uppercase mb-2">
                Active Student Session
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Welcome back, {user.real_name}!</h1>
              <p className="text-blue-100 text-sm mt-1">
                School: <span className="font-semibold text-white">{user.school || 'Private Tuition'}</span> &bull; Account status: Active
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-right">
              <p className="text-[11px] text-blue-200 uppercase tracking-wider font-semibold">Ready for Tests</p>
              <p className="text-sm font-bold">Phase 1 Initialized</p>
            </div>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Tests Attempted</p>
              <p className="text-xl font-extrabold text-slate-900">0</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Average Score</p>
              <p className="text-xl font-extrabold text-emerald-600">--%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Available Tests</p>
              <p className="text-xl font-extrabold text-purple-600">0 Active</p>
            </div>
          </div>
        </div>

        {/* Information box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Student Account Successfully Verified</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your login and role authentication is complete. As soon as your teacher schedules tests or generates 10-mark AI quick tests, they will appear right here in your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}

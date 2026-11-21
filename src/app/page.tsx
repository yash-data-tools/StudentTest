import Link from 'next/link';
import { BookOpen, ShieldCheck, Cpu, ArrowRight, UserCheck, GraduationCap, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">Smart Tuition</span>
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">Exam Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Teacher Login
            </Link>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Next-Gen Online Examination & Assessment System
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight sm:leading-tight">
            Seamless Exam Creation, AI Evaluation & Anti-Cheat Monitoring
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Designed specifically for tutors and students. Take exams in a realistic JEE-style interface, generate instant 10-mark AI topic tests, and review comprehensive teacher-moderated scorecards.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Student Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Student Examination Portal</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Simple username login with no email hassle. Attempt scheduled chapter tests, practice with quick tests, and review detailed answer solutions.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Realistic JEE-style test interface & question palette
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Instant result breakdown for AI Quick Tests
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Offline resilience & auto-recovery saving
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Student Login
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="text-center border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Register
              </Link>
            </div>
          </div>

          {/* Teacher Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Teacher & Admin Console</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Total control over exams. Upload question paper PDFs, trigger 10-mark instant AI test generation, moderate marks, and inspect anti-cheat integrity timelines.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  PDF Question Paper to interactive online test
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Teacher Review Workflow with AI provisional marks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Integrity event timeline & tab switch monitoring
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/admin/login"
                className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Access Teacher Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <p>Smart Tuition Exam Portal &copy; {new Date().getFullYear()} &bull; Built for High-Integrity Academic Assessments</p>
      </footer>
    </div>
  );
}

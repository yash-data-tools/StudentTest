'use client';

import { useState, useEffect } from 'react';
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
  School,
  Lock,
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

interface StudentProfile {
  id: string;
  username: string;
  real_name: string;
  school: string;
  status: string;
  must_change_password?: boolean;
}

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<'tests' | 'results' | 'history' | 'profile'>('tests');
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we can fetch /api/student/me or use session data
    fetch('/api/admin/students')
      .then((res) => res.json())
      .then((data) => {
        // Just mock-safe fallbacks if inspecting
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            Available & Upcoming Tests
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
            My Results
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
            {/* Quick overview alert */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Exam Session Ready
                </span>
                <h2 className="text-xl font-bold mt-2">Ready for your assessments?</h2>
                <p className="text-blue-100 text-xs mt-1">
                  Tests will appear here in JEE-style format. Choose between scheduled Chapter Tests and Instant AI Quick Tests.
                </p>
              </div>
            </div>

            {/* Test Cards List (Prepared for Phase 3/4 tests) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:border-blue-400 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      Sample Preview
                    </span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      15 mins
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Physics: Kinematics & Mechanics</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    10 Marks &bull; MCQ & Numerical &bull; Instant AI Evaluation
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">JEE Standard Pattern</span>
                  <button
                    disabled
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Phase 4 Exam Interface
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:border-purple-400 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                      Teacher-Reviewed Exam
                    </span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      60 mins
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Chemistry: Full Syllabus Mock</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    50 Marks &bull; Teacher Moderated Marking &bull; Anti-Cheat Monitored
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">PDF to Exam Workflow</span>
                  <button
                    disabled
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                  >
                    Phase 4 Exam Interface
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY RESULTS */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Published Results & Scorecards</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Once you submit an exam, instant 10-mark tests will display their breakdown immediately, while 50-mark exams will be published once reviewed by your teacher.
            </p>
          </div>
        )}

        {/* TAB 3: TEST HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Submission History</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All previous exam attempts, timestamps, and answer reviews will be archived here.
            </p>
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
                <p className="text-xs text-slate-500">Account details and school affiliation</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Role</span>
                <span className="font-bold text-blue-600 uppercase">Student</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Account Status</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="font-semibold text-slate-500">Security</span>
                <span className="font-bold text-slate-700">Encrypted Credentials</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

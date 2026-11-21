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
  created_at: string;
}

export default function TestManagementPage() {
  const [tests, setTests] = useState<ExamTest[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Test Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Overview of all generated and published question papers.
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
            Upload your first question paper PDF or generate a 10-mark AI topic test to get started.
          </p>
          <Link
            href="/admin/pdf-to-test"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            <FileUp className="w-4 h-4" />
            Upload Question Paper PDF
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
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
                      test.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{test.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {test.subject} {test.chapter ? `&bull; ${test.chapter}` : ''}
                </p>

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

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {test.total_attempts} student {test.total_attempts === 1 ? 'attempt' : 'attempts'}
                </span>
                <span className="font-semibold text-indigo-600">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { CheckCircle2, Clock, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';

export default async function ExamSubmittedPage({ searchParams }: { searchParams: Promise<{ attempt_id?: string }> }) {
  const { attempt_id } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 max-w-lg w-full text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            Teacher-Reviewed Exam Mode
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Exam Successfully Submitted!</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Your paper has been locked and securely submitted to your tutor for review and grading.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2 text-slate-600">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Next Steps: Teacher Review Workflow</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            1. Your objective answers have been provisionally evaluated by AI.
            <br />
            2. Your teacher will review each question, adjust marks if needed, and award partial credit.
            <br />
            3. Once finalized, your official scorecard and question solutions will be released on your dashboard.
          </p>
        </div>

        <div>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Return to Student Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

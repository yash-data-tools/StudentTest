import { CheckCircle, Clock } from 'lucide-react';

export default function PendingReviewsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-2">
          Phase 6 Core Feature
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Pending Teacher Reviews</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review 50-mark exam submissions, inspect AI provisional scores, adjust marks, award partial credit, and publish scorecards.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Pending Submissions Queue</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          No papers awaiting review currently. When students submit a Teacher-Reviewed exam, it will appear here for grading.
        </p>
      </div>
    </div>
  );
}

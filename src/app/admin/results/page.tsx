import { BarChart3 } from 'lucide-react';

export default function ResultsAnalyticsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Results & Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Performance analytics, score distribution, highest/lowest scores, and question-level difficulty breakdowns.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Exam Performance Insights</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Analytics will populate automatically as student attempts are completed and published.
        </p>
      </div>
    </div>
  );
}

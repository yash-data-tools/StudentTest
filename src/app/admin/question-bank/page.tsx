import { BookOpen } from 'lucide-react';

export default function QuestionBankPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Question Bank</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Reusable questions organized by Subject, Chapter, Topic, Difficulty, and Type.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Centralized Question Bank</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Questions imported from PDF extraction and generated tests can be saved and reused from here.
        </p>
      </div>
    </div>
  );
}

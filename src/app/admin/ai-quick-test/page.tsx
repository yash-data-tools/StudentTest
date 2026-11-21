import { Sparkles, Brain } from 'lucide-react';

export default function AiQuickTestPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      <div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider mb-2">
          Phase 7 Feature
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Quick Test Generator</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Generate instant 10-mark tests by selecting Subject, Chapter, Class, and Difficulty with immediate student scorecards.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Instant 10-Mark Test Engine</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          Will be built in Phase 7. Includes chapter selection, difficulty balancing, and instant objective scoring.
        </p>
      </div>
    </div>
  );
}

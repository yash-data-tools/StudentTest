import { FileUp, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PdfToTestPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      <div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-2">
          Phase 3 Core Feature
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">PDF to Interactive Test</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload question paper PDFs, parse questions with OCR & Gemini AI, review in the question editor, and publish.
        </p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <FileUp className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900">PDF Extraction & OCR Engine</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          This feature will be fully activated in Phase 3. It will extract questions, options, marks, diagrams, and equations automatically.
        </p>
      </div>
    </div>
  );
}

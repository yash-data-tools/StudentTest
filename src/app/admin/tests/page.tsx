import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';

export default function TestManagementPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Test Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, edit, schedule, publish, and manage all examinations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pdf-to-test"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create From PDF
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">All Examination Papers</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          When tests are created via PDF or AI generator, they will be listed here with options to publish, schedule, duplicate, or preview.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error caught:', error);
  }, [error]);

  return (
    <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
        ⚠️
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">Portal Connection Error</h2>
      <p className="text-xs text-slate-600 mb-6 leading-relaxed">
        {error.message || 'The admin portal encountered an error while communicating with the database.'}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Retry
        </button>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

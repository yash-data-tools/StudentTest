'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 text-2xl font-bold">
        !
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

import React from 'react';
import { Activity } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header Skeleton */}
      <header className="relative z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></div>
              <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
            <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Controls Skeleton */}
        <div className="h-16 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse"></div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse"></div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse"></div>
          <div className="h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse"></div>
        </div>
      </main>
    </div>
  );
}

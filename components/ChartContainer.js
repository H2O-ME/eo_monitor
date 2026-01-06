'use client';
import React from 'react';

export default function ChartContainer({ title, children, height = "350px", loading, icon: Icon, subtitle }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/60">
      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50/30 dark:bg-slate-800/20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {Icon && (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
              <Icon size={16} className="sm:hidden" />
              <Icon size={18} className="hidden sm:block" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        </div>
      </div>
      <div className="relative p-3 sm:p-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent shadow-lg shadow-blue-500/20"></div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading</span>
            </div>
          </div>
        )}
        <div className="w-full" style={{ height: height.includes('sm:') ? '250px' : height }}>
          {/* Simple fallback for responsive height */}
          <div className="h-full w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

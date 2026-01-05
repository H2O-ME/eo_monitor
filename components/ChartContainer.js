'use client';
import React from 'react';

export default function ChartContainer({ title, children, height = "350px", loading, icon: Icon, subtitle }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {Icon && (
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Icon size={16} className="sm:hidden" />
              <Icon size={18} className="hidden sm:block" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h3>
            {subtitle && <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Live</span>
        </div>
      </div>
      <div className="relative p-3 sm:p-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">加载中...</span>
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

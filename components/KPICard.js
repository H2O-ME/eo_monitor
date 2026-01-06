import React from 'react';

export default function KPICard({ title, value, description, loading, icon: Icon, trend, color = "blue" }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50",
    amber: "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50",
    purple: "text-purple-600 bg-purple-50 border-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800/50",
    rose: "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800/50",
    cyan: "text-cyan-600 bg-cyan-50 border-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/20 dark:border-cyan-800/50",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-800/50",
    orange: "text-orange-600 bg-orange-50 border-orange-100 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800/50",
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="space-y-1 sm:space-y-2 min-w-0">
          <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 truncate tracking-wide uppercase">{title}</p>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <h3 className={`text-lg sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 truncate ${loading ? 'animate-pulse bg-slate-100 dark:bg-slate-800 rounded text-transparent' : ''}`}>
              {loading ? '000.00 GB' : value}
            </h3>
            {trend && !loading && (
              <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full ${trend > 0 ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-[9px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 line-clamp-1">{description}</p>
        </div>
        
        {Icon && (
          <div className={`rounded-xl border p-2 sm:p-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${selectedColor}`}>
            <Icon size={18} className="sm:hidden" />
            <Icon size={24} className="hidden sm:block" />
          </div>
        )}
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-[0.05] text-slate-900 dark:text-white transition-all duration-500 group-hover:scale-125 group-hover:-rotate-12">
        {Icon && <Icon size={120} />}
      </div>
    </div>
  );
}

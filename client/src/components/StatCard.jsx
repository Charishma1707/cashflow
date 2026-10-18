import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  badgeType = 'default', // 'success', 'warning', 'danger', 'info', 'default'
  accentColor = 'cyan', // 'cyan', 'emerald', 'indigo', 'rose', 'amber'
}) {
  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    info: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    default: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
  };

  const accentIcons = {
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200 shadow-xs',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs',
    rose: 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 shadow-xs',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs',
  };

  const topGlows = {
    cyan: 'via-cyan-500',
    emerald: 'via-emerald-500',
    indigo: 'via-indigo-500',
    rose: 'via-rose-500',
    amber: 'via-amber-500',
    blue: 'via-blue-500',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-300 relative overflow-hidden group">
      {/* Subtle top glow line */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent ${topGlows[accentColor] || 'via-blue-500'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight font-mono">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${accentIcons[accentColor] || accentIcons.cyan}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || badgeText) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtext && <span className="text-slate-500 font-medium truncate max-w-[200px]">{subtext}</span>}
          {badgeText && (
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[11px] ml-auto ${
                badgeStyles[badgeType] || badgeStyles.default
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}


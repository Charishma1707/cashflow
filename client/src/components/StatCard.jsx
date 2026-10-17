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
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    default: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  };

  const accentIcons = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 transition-all duration-300 relative overflow-hidden group">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <h3 className="text-2xl font-bold text-white mt-1 tracking-tight font-mono">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${accentIcons[accentColor] || accentIcons.cyan} shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || badgeText) && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {subtext && <span className="text-slate-400 truncate max-w-[200px]">{subtext}</span>}
          {badgeText && (
            <span
              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ml-auto ${
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

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  ArrowDownCircle,
  CreditCard,
  Settings,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ business }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
    { name: 'Expenses', path: '/expenses', icon: ArrowDownCircle },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/90 flex flex-col shrink-0 h-screen sticky top-0 shadow-sm">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="font-extrabold text-base tracking-tight text-slate-900">CashFlow</h1>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black text-sm tracking-wider">COPILOT</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">Financial Workspace</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Workspace Footer Card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70">
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800 truncate">
              {business?.name || 'Acme Studio'}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>PayPal Sandbox Ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
}


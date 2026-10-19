import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  FileText,
  TrendingUp,
  BarChart3,
  Bot,
  Settings,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';
import InvoiceModal from '../components/InvoiceModal';
import ExpenseModal from '../components/ExpenseModal';
import { getPayPalStatus } from '../services/api';

const OWNER_NAV = [
  { name: 'Business Overview', path: '/owner/overview', icon: LayoutDashboard },
  { name: 'Products & Inventory', path: '/owner/products', icon: Package },
  { name: 'Orders', path: '/owner/orders', icon: ShoppingCart },
  { name: 'Transactions', path: '/owner/transactions', icon: Receipt },
  { name: 'Customers', path: '/owner/customers', icon: Users },
  { name: 'Invoices', path: '/owner/invoices', icon: FileText },
  { name: 'Cash Flow', path: '/owner/cash-flow', icon: TrendingUp },
  { name: 'Analytics & Reports', path: '/owner/analytics', icon: BarChart3 },
  { name: 'AI Business Copilot', path: '/owner/ai', icon: Bot, highlight: true },
  { name: 'Settings', path: '/owner/settings', icon: Settings },
];

export default function OwnerLayout() {
  const { ownerProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState(null);

  useEffect(() => {
    getPayPalStatus()
      .then(setPaypalStatus)
      .catch((e) => console.warn('PayPal status check warning:', e.message));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Owner Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">FreshCart Groceries</h1>
              <p className="text-[11px] font-semibold text-blue-400">Owner Workspace</p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="px-1">
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {OWNER_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : item.highlight
                        ? 'text-violet-400 hover:bg-violet-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.highlight && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Copilot
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Exit & Profile */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center font-bold text-xs">
              MV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{ownerProfile.name}</p>
              <p className="text-[10px] text-slate-400 truncate">Store Administrator</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch Role / Exit</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Owner Permissions Granted
            </span>

            {paypalStatus?.configured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PayPal Sandbox Live
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>+ Record Expense</span>
            </button>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>+ New Invoice</span>
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            <Outlet context={{ setIsInvoiceModalOpen, setIsExpenseModalOpen }} />
          </div>
        </main>
      </div>

      {/* Owner Global Modals */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          onClose={() => setIsInvoiceModalOpen(false)}
          onInvoiceCreated={() => {
            setIsInvoiceModalOpen(false);
          }}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
          onExpenseCreated={() => {
            setIsExpenseModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

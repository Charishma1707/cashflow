import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Store,
  Package,
  CreditCard,
  FileText,
  PieChart,
  Bot,
  Settings,
  ShoppingBag,
  ArrowLeft,
  User,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useAuth, PRESET_CUSTOMERS } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Breadcrumbs from '../components/Breadcrumbs';
import CartDrawer from '../components/CartDrawer';

const NAV_ITEMS = [
  { name: 'Home', path: '/customer/home', icon: Home },
  { name: 'Shop', path: '/customer/shop', icon: Store },
  { name: 'My Orders', path: '/customer/orders', icon: Package },
  { name: 'My Payments', path: '/customer/payments', icon: CreditCard },
  { name: 'My Invoices', path: '/customer/invoices', icon: FileText },
  { name: 'My Spending', path: '/customer/spending', icon: PieChart },
  { name: 'AI Shopping Assistant', path: '/customer/ai', icon: Bot, highlight: true },
  { name: 'Settings', path: '/customer/settings', icon: Settings },
];

export default function CustomerLayout() {
  const { currentCustomer, switchCustomer, logout } = useAuth();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Customer Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900">Cashflow Copilot</h1>
              <p className="text-[11px] font-semibold text-emerald-600">Customer Portal</p>
            </div>
          </div>

          {/* Customer Switcher Selector */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Active Shopper Profile
            </label>
            <div className="relative">
              <select
                value={currentCustomer?.email}
                onChange={(e) => {
                  const found = PRESET_CUSTOMERS.find((c) => c.email === e.target.value);
                  if (found) switchCustomer(found);
                }}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none"
              >
                {PRESET_CUSTOMERS.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.name} ({c.company})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
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
                        ? 'text-indigo-600 hover:bg-indigo-50/70'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.highlight && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-700">
                      AI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Return Gateway */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Customer Session Verified
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              <span>Cart</span>
              {totalItemsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Profile Pill */}
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                {currentCustomer?.name?.charAt(0) || 'C'}
              </div>
              <span className="font-semibold text-slate-900">{currentCustomer?.name}</span>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Slide-out Cart */}
      <CartDrawer />
    </div>
  );
}

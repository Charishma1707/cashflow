import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Bot,
  Layers,
  CheckCircle2,
  Building2,
  Package,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function WelcomeGatewayPage() {
  const navigate = useNavigate();
  const { selectRole } = useAuth();

  const handleSelectCustomer = () => {
    selectRole('customer');
    navigate('/customer/home');
  };

  const handleSelectOwner = () => {
    selectRole('owner');
    navigate('/owner/overview');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full text-center space-y-4 pt-6 z-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-emerald-400">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Cashflow Copilot Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Select Your Experience
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Experience both sides of our production platform: run store operations, inventory, and cash flow as the{' '}
          <strong className="text-white">Store Owner</strong> or shop, manage monthly spending allowance, and pay invoices as a{' '}
          <strong className="text-white">Customer</strong>.
        </p>
      </div>

      {/* Two Part Selection Cards */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 my-10 z-10">
        {/* CARD 1: STORE OWNER (MERCHANT) */}
        <div
          onClick={handleSelectOwner}
          className="group bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 hover:border-blue-500 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:shadow-blue-500/20 hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Owner Role
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                Store Owner Portal
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Full back-office enterprise workspace: Manage product catalog & inventory levels in AG Grid, review checkout orders, dispatch invoice reminders with AI Copilot, and forecast 6 & 12-month cash flow runways.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Executive overview with confirmed liquid funds & reserve floor</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>AG Grid Product Catalog, Inventory, Orders & Customers</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Pay Canva & Figma subscriptions with PayPal Sandbox</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>AI Business Copilot with interactive action proposal cards</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Workspace</span>
              <span className="text-sm font-bold text-white">Owner Back-Office</span>
            </div>
            <div className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 group-hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all">
              <span>Continue as Owner</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* CARD 2: CUSTOMER PORTAL */}
        <div
          onClick={handleSelectCustomer}
          className="group bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 hover:border-emerald-500 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/20 hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-600/10 rounded-full blur-2xl group-hover:bg-emerald-600/20 transition-all pointer-events-none" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Customer Role
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                Customer Portal & Shop
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Shop organic groceries, checkout with PayPal Sandbox, settle delivery invoices, and track your monthly spending allowance with an AI Shopping Assistant.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Shop catalog with live stock & shopping cart checkout</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Monthly spending allowance with recurring top-up schedule</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AG Grid personal spending ledger, orders & payments</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI Shopping Assistant with product recommendation action cards</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Workspace</span>
              <span className="text-sm font-bold text-white">Shopper & Client</span>
            </div>
            <div className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all">
              <span>Continue as Customer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/80 gap-3 z-10">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PayPal Sandbox Verified • Server-Side Financial Authorization</span>
        </div>
        <span>Cashflow Copilot © 2026. All rights reserved.</span>
      </div>
    </div>
  );
}

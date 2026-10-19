import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Users,
  Bot,
  Sparkles,
  CreditCard,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { getDashboardSummary, getOrders, formatMoney } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerOverviewPage() {
  const navigate = useNavigate();
  const { setIsInvoiceModalOpen } = useOutletContext() || {};

  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboardSummary(), getOrders()])
      .then(([dashData, ordData]) => {
        setSummary(dashData);
        setOrders(ordData || []);
      })
      .catch((e) => console.warn('Owner overview load warning:', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Calculating business cash flow and store metrics..." />
      </div>
    );
  }

  const kpis = summary?.kpis || {};
  const business = summary?.business || {};

  return (
    <div className="space-y-6">
      {/* Executive Store Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-400 text-xs font-bold backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5" />
            <span>Store Operations Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{business.name || 'FreshCart Groceries'}</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time multi-channel overview: E-commerce order checkout revenues, wholesale client invoices, and SaaS tool expenses.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Cash Balance"
          value={formatMoney(kpis.currentCashBalance || 2500000)}
          subtitle="Confirmed liquid funds"
          icon={TrendingUp}
          color="emerald"
          onClick={() => navigate('/owner/cash-flow')}
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatMoney(kpis.totalOutstandingReceivables || 0)}
          subtitle={`${kpis.unpaidInvoicesCount || 0} unpaid client invoices`}
          icon={FileText}
          color="rose"
          onClick={() => navigate('/owner/invoices')}
        />
        <StatCard
          title="Monthly Revenue Collected"
          value={formatMoney(kpis.monthlyRevenueCollected || 0)}
          subtitle="PayPal verified captures"
          icon={CreditCard}
          color="blue"
          onClick={() => navigate('/owner/transactions')}
        />
        <StatCard
          title="Total Store Orders"
          value={orders.length.toString()}
          subtitle="Catalog purchases"
          icon={ShoppingCart}
          color="indigo"
          onClick={() => navigate('/owner/orders')}
        />
      </div>

      {/* AI Business Insight Callout */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-violet-600 text-white rounded-2xl shadow-md shadow-violet-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-900">
              AI Copilot Executive Insight
            </h3>
            <p className="text-xs text-slate-700 mt-1 max-w-2xl leading-relaxed">
              Operating runway stands strong at <strong>~18 months</strong> above minimum cash reserve. 2 wholesale client invoices are past due ($2,650.00). Dispatched AI reminders can accelerate liquidity by 14 days.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/owner/ai')}
          className="flex items-center space-x-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-shrink-0"
        >
          <span>Ask Copilot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Two Column Section: Recent Store Orders & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent E-Commerce Orders */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
            </div>
            <button
              onClick={() => navigate('/owner/orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View All ({orders.length})
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No orders received yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 4).map((ord) => (
                <div key={ord._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-800">{ord.orderNumber}</p>
                    <p className="text-[11px] text-slate-500">
                      {ord.customer?.name} • {ord.items?.length} items
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-xs font-mono font-bold text-slate-900">{formatMoney(ord.totalCents)}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {ord.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operating SaaS Subscriptions */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Operating SaaS Subscriptions</h2>
            </div>
            <button
              onClick={() => navigate('/owner/cash-flow')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Cash Flow Runway
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Canva Pro Marketing & Social Assets</p>
                <p className="text-[11px] text-slate-500">Weekly flyers & grocery promotions</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">$12.99 / mo</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Figma Professional Design License</p>
                <p className="text-[11px] text-slate-500">Store mobile app & UI components</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">$15.00 / mo</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">AWS Cloud Hosting & Database Infrastructure</p>
                <p className="text-[11px] text-slate-500">Production web store & backend API</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">$45.00 / mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

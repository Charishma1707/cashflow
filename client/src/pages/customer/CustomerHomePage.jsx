import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingDown,
  Calendar,
  Sparkles,
  ArrowRight,
  Store,
  FileText,
  Package,
  AlertCircle,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerSpending, getInvoices, getOrders, formatMoney } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerHomePage() {
  const { currentCustomer } = useAuth();
  const navigate = useNavigate();

  const [spending, setSpending] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCustomer?.email) return;
    setLoading(true);
    Promise.all([
      getCustomerSpending(currentCustomer.email),
      getInvoices({ email: currentCustomer.email }),
      getOrders({ customerEmail: currentCustomer.email }),
    ])
      .then(([spendData, invData, ordData]) => {
        setSpending(spendData);
        setInvoices(invData || []);
        setOrders(ordData || []);
      })
      .catch((err) => console.warn('Customer home data warning:', err.message))
      .finally(() => setLoading(false));
  }, [currentCustomer]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading customer overview..." />
      </div>
    );
  }

  const budgetLimit = spending?.monthlyBudgetLimitCents || 50000;
  const spentThisMonth = spending?.spentThisMonthCents || 0;
  const remainingBudget = Math.max(0, budgetLimit - spentThisMonth);
  const percentUsed = Math.min(100, Math.round((spentThisMonth / budgetLimit) * 100));

  const pendingInvoices = invoices.filter((i) => i.status !== 'PAID');
  const outstandingReceivable = pendingInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Customer Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {currentCustomer?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Track your monthly organic grocery allowance, check out fresh seasonal harvest, and manage invoices seamlessly.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/customer/shop')}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Browse Shop</span>
            </button>
            <button
              onClick={() => navigate('/customer/ai')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold border border-white/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Spending Budget"
          value={formatMoney(budgetLimit)}
          subtitle="Pre-allocated monthly limit"
          icon={Wallet}
          color="blue"
        />

        <StatCard
          title="Spent This Month"
          value={formatMoney(spentThisMonth)}
          subtitle={`${percentUsed}% of budget utilized`}
          icon={TrendingDown}
          color="emerald"
        />

        <StatCard
          title="Allowance Remaining"
          value={formatMoney(remainingBudget)}
          subtitle="Available to spend safely"
          icon={CheckCircle2}
          color="indigo"
        />

        <StatCard
          title="Pending Invoices"
          value={formatMoney(outstandingReceivable)}
          subtitle={`${pendingInvoices.length} bills awaiting PayPal`}
          icon={FileText}
          color="rose"
        />
      </div>

      {/* Spending Progress & Recurring Contribution Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Monthly Spending Allowance Progress</h2>
            <p className="text-xs text-slate-500">
              {formatMoney(spentThisMonth)} spent of {formatMoney(budgetLimit)} budget
            </p>
          </div>
          <button
            onClick={() => navigate('/customer/spending')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View Full Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>$0.00</span>
            <span>{percentUsed}% Used</span>
            <span>{formatMoney(budgetLimit)}</span>
          </div>
        </div>

        {/* Recurring Contribution Banner */}
        {spending?.recurringContribution?.enabled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Scheduled Recurring Contribution: {formatMoney(spending.recurringContribution.amountCents)} / month
                </p>
                <p className="text-[11px] text-slate-500">
                  Next scheduled top-up on{' '}
                  {new Date(spending.recurringContribution.nextBillingDate).toLocaleDateString()} via PayPal
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/customer/settings')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs"
            >
              Manage Schedule
            </button>
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Orders & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Grocery Purchases</h2>
            </div>
            <button
              onClick={() => navigate('/customer/orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View All ({orders.length})
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No purchases yet. Start shopping in our fresh catalog!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 3).map((ord) => (
                <div key={ord._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-800">{ord.orderNumber}</p>
                    <p className="text-[11px] text-slate-500">
                      {ord.items?.length} items • {new Date(ord.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
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

        {/* Pending & Recent Invoices */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Invoices</h2>
            </div>
            <button
              onClick={() => navigate('/customer/invoices')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View All ({invoices.length})
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No invoices issued to this account.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.slice(0, 3).map((inv) => (
                <div key={inv._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-800">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-xs font-mono font-bold text-slate-900">{formatMoney(inv.totalAmount)}</p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

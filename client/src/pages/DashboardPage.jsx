import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDashboardSummary, formatMoney } from '../services/api';

export default function DashboardPage({
  onOpenInvoiceModal,
  onOpenExpenseModal,
  onSelectInvoice,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Crunching financial metrics..." />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="glass-panel p-6 rounded-2xl max-w-md mx-auto border border-rose-500/30">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-white">Dashboard Error</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { metrics, business, monthlyTrend, invoiceStatusBreakdown, recentActivity } = data;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Financial Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time cash flow monitoring and PayPal Sandbox payments for {business.name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Cash Card */}
        <StatCard
          title="Current Available Cash"
          value={formatMoney(metrics.currentAvailableCash, business.currency)}
          subtext={`Opening: ${formatMoney(metrics.openingBalance)}`}
          icon={Wallet}
          accentColor="cyan"
          badgeText={metrics.isReserveHealthy ? 'Above Reserve' : 'Below Reserve!'}
          badgeType={metrics.isReserveHealthy ? 'success' : 'danger'}
        />

        {/* Total Payments Collected */}
        <StatCard
          title="Payments Collected"
          value={formatMoney(metrics.totalPaymentsCollected, business.currency)}
          subtext="Verified settled revenue"
          icon={ArrowUpRight}
          accentColor="emerald"
          badgeText="Inflow"
          badgeType="success"
        />

        {/* Outstanding Receivables */}
        <StatCard
          title="Outstanding Receivables"
          value={formatMoney(metrics.outstandingReceivables, business.currency)}
          subtext={
            metrics.overdueReceivables > 0
              ? `${formatMoney(metrics.overdueReceivables)} overdue`
              : 'All current'
          }
          icon={Clock}
          accentColor="indigo"
          badgeText={metrics.overdueCount > 0 ? `${metrics.overdueCount} Overdue` : 'On Track'}
          badgeType={metrics.overdueCount > 0 ? 'warning' : 'info'}
        />

        {/* Scheduled Obligations */}
        <StatCard
          title="Upcoming Expenses"
          value={formatMoney(metrics.scheduledExpenses, business.currency)}
          subtext="Next 30 days obligations"
          icon={ArrowDownRight}
          accentColor="rose"
          badgeText="Obligations"
          badgeType="default"
        />
      </div>

      {/* Secondary Liquidity & Cash Reserve Strip */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              metrics.isReserveHealthy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {metrics.isReserveHealthy ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-white">
                Cash Reserve Floor: {formatMoney(metrics.minimumCashReserve)}
              </h4>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  metrics.isReserveHealthy
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {metrics.isReserveHealthy ? 'Healthy Cushion' : 'Liquidity Warning'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Available Cash ({formatMoney(metrics.currentAvailableCash)}) - Scheduled Obligations (
              {formatMoney(metrics.scheduledExpenses)}) leaves a projected net cash of{' '}
              <strong className="text-white font-mono">{formatMoney(metrics.projectedNetCash)}</strong>.
            </p>
          </div>
        </div>

        <div className="text-right text-xs shrink-0 font-mono">
          <span className="text-slate-400 block">Variance to Minimum Reserve</span>
          <span
            className={`text-sm font-bold ${
              metrics.reserveVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.reserveVariance >= 0 ? '+' : ''}
            {formatMoney(metrics.reserveVariance)}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Cash Flow Trend</h3>
              <p className="text-xs text-slate-400">Inflows (payments) vs Outflows (expenses)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                <span className="text-slate-400">Inflow</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                <span className="text-slate-400">Outflow</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInflow)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutflow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Invoice Receivables</h3>
            <p className="text-xs text-slate-400 mb-4">Breakdown by current lifecycle status</p>

            <div className="space-y-3">
              {invoiceStatusBreakdown?.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.status}</span>
                    <span className="font-mono text-slate-400">
                      {formatMoney(item.totalAmount)} ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === 'PAID'
                          ? 'bg-emerald-400'
                          : item.status === 'OVERDUE'
                          ? 'bg-rose-500'
                          : item.status === 'PARTIALLY_PAID'
                          ? 'bg-indigo-400'
                          : item.status === 'SENT'
                          ? 'bg-cyan-400'
                          : 'bg-slate-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (item.totalAmount / (metrics.outstandingReceivables + 1)) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 text-xs flex justify-between items-center text-slate-400">
            <span>Total Invoices</span>
            <span className="font-semibold text-white">{metrics.totalInvoicesCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Sections (Recent Invoices & Upcoming Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices with Quick Pay action */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Recent Invoices</span>
            </h3>
            <span className="text-xs text-slate-400">Click to preview & pay</span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.invoices?.map((inv) => (
              <div
                key={inv._id}
                onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                className="p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-cyan-500/30 flex items-center justify-between cursor-pointer transition-all group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-xs text-slate-400">• {inv.customer?.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Due {new Date(inv.dueDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-white block">
                    {formatMoney(inv.outstandingBalance)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : inv.status === 'OVERDUE'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-cyan-500/10 text-cyan-400'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Financial Obligations (Expenses) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>Upcoming Scheduled Expenses</span>
            </h3>
            <span className="text-xs text-slate-400">Scheduled outflows</span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.upcomingExpenses?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No scheduled expenses found.</p>
            ) : (
              recentActivity.upcomingExpenses?.map((exp) => (
                <div
                  key={exp._id}
                  className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-medium text-slate-200 block">
                      {exp.description}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {exp.vendor || exp.category} • Due {new Date(exp.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    -{formatMoney(exp.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

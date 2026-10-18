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
  RefreshCw,
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
  onDataLoaded,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [statusText, setStatusText] = useState('Crunching financial metrics...');

  const loadDashboard = async (attempt = 1) => {
    try {
      setLoading(true);
      setError(null);
      if (attempt > 1) {
        setStatusText(`Waking up Render backend (attempt ${attempt}/5)...`);
      } else {
        setStatusText('Crunching financial metrics...');
      }

      const summary = await getDashboardSummary();
      setData(summary);
      if (onDataLoaded && summary) {
        onDataLoaded(summary);
      }
      setLoading(false);
      setRetryAttempt(0);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      const isColdStart =
        err.isColdStart ||
        err.message?.includes('HTML instead of JSON') ||
        err.message?.includes('waking up') ||
        err.response?.status === 502 ||
        err.response?.status === 503 ||
        err.response?.status === 504;

      if (isColdStart && attempt < 5) {
        setRetryAttempt(attempt);
        setStatusText(`Render free-tier is waking up (attempt ${attempt}/5)... Retrying in 4s`);
        setTimeout(() => {
          loadDashboard(attempt + 1);
        }, 4000);
      } else {
        setError(err.response?.data?.error || err.message || 'Unable to connect to server');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && (!data || !data.metrics)) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner text={statusText} />
        {retryAttempt > 0 && (
          <p className="text-xs text-cyan-400/80 animate-pulse max-w-sm">
            Render free web services spin down after inactivity. Cold starts typically take 30-45 seconds.
          </p>
        )}
      </div>
    );
  }

  if (error && (!data || !data.metrics)) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Connection Error</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              The backend may be spinning up from idle state. Try reconnecting now.
            </p>
          </div>
          <button
            onClick={() => loadDashboard(1)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const { metrics, business = {}, monthlyTrend = [], invoiceStatusBreakdown = [], recentActivity = {} } = data || {};

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Financial Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Live Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time cash flow monitoring and PayPal Sandbox payments for {business.name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              metrics.isReserveHealthy
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs'
                : 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs'
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
              <h4 className="text-sm font-bold text-slate-900">
                Cash Reserve Floor: {formatMoney(metrics.minimumCashReserve)}
              </h4>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  metrics.isReserveHealthy
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {metrics.isReserveHealthy ? 'Healthy Cushion' : 'Liquidity Warning'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Available Cash ({formatMoney(metrics.currentAvailableCash)}) - Scheduled Obligations (
              {formatMoney(metrics.scheduledExpenses)}) leaves a projected net cash of{' '}
              <strong className="text-slate-800 font-bold font-mono">{formatMoney(metrics.projectedNetCash)}</strong>.
            </p>
          </div>
        </div>

        <div className="text-right text-xs shrink-0 font-mono">
          <span className="text-slate-400 block font-medium font-sans">Variance to Minimum Reserve</span>
          <span
            className={`text-sm font-extrabold ${
              metrics.reserveVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Cash Flow Trend</h3>
              <p className="text-xs text-slate-500 font-medium">Inflows (payments) vs Outflows (expenses)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                <span className="text-slate-600 font-semibold">Inflow</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <span className="text-slate-600 font-semibold">Outflow</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    color: '#0f172a',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorInflow)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOutflow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Invoice Receivables</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">Breakdown by current lifecycle status</p>

            <div className="space-y-3.5">
              {invoiceStatusBreakdown?.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold">{item.status}</span>
                    <span className="font-mono text-slate-500 font-medium">
                      {formatMoney(item.totalAmount)} ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === 'PAID'
                          ? 'bg-emerald-500'
                          : item.status === 'OVERDUE'
                          ? 'bg-rose-500'
                          : item.status === 'PARTIALLY_PAID'
                          ? 'bg-indigo-500'
                          : item.status === 'SENT'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
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

          <div className="pt-4 border-t border-slate-100 mt-4 text-xs flex justify-between items-center text-slate-500">
            <span className="font-medium">Total Invoices</span>
            <span className="font-bold text-slate-900">{metrics.totalInvoicesCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Sections (Recent Invoices & Upcoming Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices with Quick Pay action */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Recent Invoices</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Click to preview & pay</span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.invoices?.map((inv) => (
              <div
                key={inv._id}
                onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">• {inv.customer?.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Due {new Date(inv.dueDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {formatMoney(inv.outstandingBalance)}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : inv.status === 'OVERDUE'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>Upcoming Scheduled Expenses</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Scheduled outflows</span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.upcomingExpenses?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No scheduled expenses found.</p>
            ) : (
              recentActivity.upcomingExpenses?.map((exp) => (
                <div
                  key={exp._id}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {exp.description}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {exp.vendor || exp.category} • Due {new Date(exp.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-600">
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


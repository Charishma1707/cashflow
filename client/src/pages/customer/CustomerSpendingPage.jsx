import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Download,
  Search,
  Plus,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getCustomerSpending, topUpAllowance, formatMoney } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const CATEGORY_DATA = [
  { name: 'Dairy & Plant Milk', value: 2400, color: '#3b82f6' },
  { name: 'Organic Produce', value: 4500, color: '#10b981' },
  { name: 'Bakery & Grains', value: 1600, color: '#f59e0b' },
  { name: 'Pantry & Honey', value: 3250, color: '#8b5cf6' },
  { name: 'Coffee & Drinks', value: 1600, color: '#ec4899' },
];

export default function CustomerSpendingPage() {
  const { currentCustomer } = useAuth();
  const [spending, setSpending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50');

  const gridRef = useRef();

  const loadSpending = async () => {
    if (!currentCustomer?.email) return;
    setLoading(true);
    try {
      const data = await getCustomerSpending(currentCustomer.email);
      setSpending(data);
    } catch (err) {
      console.warn('Failed to load spending:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpending();
  }, [currentCustomer]);

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    try {
      const amountCents = Math.round(Number(topUpAmount) * 100);
      await topUpAllowance({
        customerEmail: currentCustomer.email,
        amountCents,
        description: `Manual PayPal Allowance Top-Up ($${topUpAmount}.00)`,
      });
      setIsTopUpOpen(false);
      loadSpending();
    } catch (err) {
      alert('Top-up failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const budgetLimit = spending?.monthlyBudgetLimitCents || 50000;
  const spentThisMonth = spending?.spentThisMonthCents || 0;
  const remainingBudget = Math.max(0, budgetLimit - spentThisMonth);
  const availableBalance = spending?.availableBalanceCents || 0;
  const percentUsed = Math.min(100, Math.round((spentThisMonth / budgetLimit) * 100));

  // Ledger Type Cell Renderer
  const TypeCellRenderer = (params) => {
    const type = params.value;
    const isCredit = type === 'TOP_UP' || type === 'REFUND';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
          isCredit ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {type}
      </span>
    );
  };

  // Amount Cell Renderer
  const AmountCellRenderer = (params) => {
    const val = params.value;
    const isPositive = val > 0;
    return (
      <span
        className={`font-mono font-bold text-xs ${
          isPositive ? 'text-emerald-600' : 'text-slate-900'
        }`}
      >
        {isPositive ? `+${formatMoney(val)}` : formatMoney(val)}
      </span>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        pinned: 'left',
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
        sort: 'desc',
      },
      {
        field: 'type',
        headerName: 'Entry Type',
        width: 130,
        cellRenderer: TypeCellRenderer,
      },
      {
        field: 'description',
        headerName: 'Transaction Description',
        flex: 1,
        minWidth: 220,
        cellClass: 'font-medium text-slate-800',
      },
      {
        field: 'referenceId',
        headerName: 'Reference #',
        width: 150,
        cellClass: 'font-mono text-slate-500 text-xs',
      },
      {
        field: 'amountCents',
        headerName: 'Amount',
        width: 130,
        cellClass: 'text-right',
        cellRenderer: AmountCellRenderer,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'balanceAfterCents',
        headerName: 'Balance After',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-blue-600',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `Spending_Ledger_${currentCustomer.email}_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Calculating spending balances and ledger..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Top-up trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Personal Spending & Monthly Allowance</h1>
          <p className="text-xs text-slate-500">
            Reconciled immutable ledger of all allowance contributions, grocery debits, and balance records.
          </p>
        </div>

        <button
          onClick={() => setIsTopUpOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Top-Up Allowance</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Budget Limit"
          value={formatMoney(budgetLimit)}
          subtitle="Pre-configured spending envelope"
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Spent This Month"
          value={formatMoney(spentThisMonth)}
          subtitle={`${percentUsed}% of budget used`}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="Allowance Remaining"
          value={formatMoney(remainingBudget)}
          subtitle="Safe to spend this cycle"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Prepaid Account Balance"
          value={formatMoney(availableBalance)}
          subtitle="Funds available for immediate debit"
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Spending by Grocery Category</h3>
            <span className="text-xs text-slate-400 font-medium">Current Month</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CATEGORY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 100).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(val) => [formatMoney(val), 'Amount Spent']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recurring Contribution Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Recurring Monthly Allowance</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Auto-replenish your grocery balance every month through verified PayPal recurring billing.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Amount</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(spending?.recurringContribution?.amountCents || 5000)} / month
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Frequency</span>
                <span className="font-semibold text-slate-800">Every 30 Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-600">
                  {spending?.recurringContribution?.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>PayPal Billing Agreement</span>
            </span>
            <span className="font-medium text-blue-600 cursor-pointer">Edit</span>
          </div>
        </div>
      </div>

      {/* AG Grid Section: Immutable Financial Ledger */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ledger entries (order #, top-up, date)..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Ledger CSV</span>
          </button>
        </div>

        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '440px', width: '100%' }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={spending?.ledger || []}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows={true}
          />
        </div>
      </div>

      {/* Top Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <form
            onSubmit={handleTopUpSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">Top-Up Monthly Grocery Allowance</h3>
            <p className="text-xs text-slate-500">
              Instantly credit your available spend balance via PayPal Sandbox.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Top-Up Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTopUpOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirm PayPal Top-Up
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  Plus,
  Trash2,
  CheckCircle,
  Ban,
  Building2,
  Calendar,
  Tag,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getExpenses, updateExpenseStatus, deleteExpense, formatMoney } from '../services/api';

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'PAID', 'CANCELLED'];

export default function ExpensesPage({ onOpenExpenseModal }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const list = await getExpenses(params);
      setExpenses(list);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateExpenseStatus(id, status);
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update expense status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await deleteExpense(id);
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const scheduledTotal = expenses
    .filter((e) => e.status === 'SCHEDULED')
    .reduce((sum, e) => sum + e.amount, 0);

  const paidTotal = expenses
    .filter((e) => e.status === 'PAID')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Expenses & Obligations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track business operating costs, subscriptions, contractors, and upcoming cash outflows
          </p>
        </div>
        <button
          onClick={onOpenExpenseModal}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-900/30 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Scheduled Obligations</span>
            <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
              {formatMoney(scheduledTotal)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Paid Outflows (Settled)</span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              {formatMoney(paidTotal)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
              statusFilter === st
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading expenses..." />
      ) : error ? (
        <div className="glass-panel p-6 rounded-2xl text-center border border-rose-500/30">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ArrowDownCircle}
          title="No expenses found"
          description="Track planned operational costs and recurring software licenses."
          actionText="Record Expense"
          onAction={onOpenExpenseModal}
        />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{exp.description}</div>
                      {exp.notes && (
                        <span className="text-[11px] text-slate-400 font-normal">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{exp.vendor || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(exp.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                      -{formatMoney(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          exp.status === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : exp.status === 'SCHEDULED'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {exp.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusChange(exp._id, 'PAID')}
                          title="Mark as Paid"
                          className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {exp.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(exp._id, 'CANCELLED')}
                          title="Cancel Expense"
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp._id)}
                        title="Delete"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

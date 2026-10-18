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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expenses & Obligations</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track business operating costs, subscriptions, contractors, and upcoming cash outflows
          </p>
        </div>
        <button
          onClick={onOpenExpenseModal}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-700 hover:to-pink-700 shadow-md shadow-rose-500/25 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Scheduled Obligations</span>
            <div className="text-xl font-extrabold text-rose-600 font-mono mt-0.5">
              {formatMoney(scheduledTotal)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Paid Outflows (Settled)</span>
            <div className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
              {formatMoney(paidTotal)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              statusFilter === st
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-2xs'
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
        <div className="bg-white p-6 rounded-2xl text-center border border-rose-200 shadow-xs">
          <p className="text-xs text-rose-600 font-semibold">{error}</p>
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{exp.description}</div>
                      {exp.notes && (
                        <span className="text-[11px] text-slate-400 font-medium">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{exp.vendor || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(exp.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      -{formatMoney(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          exp.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : exp.status === 'SCHEDULED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {exp.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusChange(exp._id, 'PAID')}
                          title="Mark as Paid"
                          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {exp.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(exp._id, 'CANCELLED')}
                          title="Cancel Expense"
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp._id)}
                        title="Delete"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
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

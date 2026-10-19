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
  CreditCard,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SubscriptionPayModal from '../components/SubscriptionPayModal';
import { getExpenses, updateExpenseStatus, deleteExpense, formatMoney } from '../services/api';

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'PAID', 'CANCELLED'];

export default function ExpensesPage({ onOpenExpenseModal }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
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

  // Subscriptions filter
  const subscriptions = expenses.filter(
    (e) => e.isSubscription || e.category === 'Software & Subscriptions'
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 uppercase">
              Financial Outflows
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">SaaS Subscriptions & OpEx</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Expenses & SaaS Subscriptions
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage operational costs and pay software licenses (Canva, Figma, AWS, Adobe) required to provide client services.
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

      {/* SaaS Subscriptions Hub with PayPal Checkout */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-lg border border-indigo-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/30 flex items-center justify-center text-indigo-300 border border-indigo-400/30 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide">
                Operating SaaS Subscriptions (Canva, Figma, AWS, Adobe)
              </h3>
              <p className="text-xs text-indigo-200">
                Software tools required to produce deliverables for clients. Settle instantly via PayPal Sandbox.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PayPal Sandbox Orders Integrated</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {subscriptions.map((sub) => {
            const isPaid = sub.status === 'PAID';
            return (
              <div
                key={sub._id}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 hover:border-indigo-400/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">
                      {sub.platform || sub.vendor}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 line-clamp-2">{sub.description}</p>
                  <div className="text-[11px] text-indigo-300 font-mono">
                    Due: {new Date(sub.dueDate).toLocaleDateString()} ({sub.frequency || 'MONTHLY'})
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="font-extrabold text-base text-white">
                    {formatMoney(sub.amount)}
                  </div>
                  {isPaid ? (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedSubscription(sub)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-xs transition-all cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay via PayPal</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                  <th className="py-3 px-4">Vendor / Tool</th>
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
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {exp.platform || exp.vendor || '—'}
                    </td>
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
                          onClick={() => setSelectedSubscription(exp)}
                          className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer mr-1"
                          title="Pay via PayPal Sandbox"
                        >
                          Pay PayPal
                        </button>
                      )}
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

      {/* Subscription Pay Modal */}
      <SubscriptionPayModal
        expense={selectedSubscription}
        isOpen={Boolean(selectedSubscription)}
        onClose={() => setSelectedSubscription(null)}
        onPaymentSuccess={() => {
          loadExpenses();
          setSelectedSubscription(null);
        }}
      />
    </div>
  );
}

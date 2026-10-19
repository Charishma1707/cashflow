import React, { useState, useEffect } from 'react';
import { Settings, Wallet, Calendar, ShieldCheck, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerSpending, updateSpendingSettings, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerSettingsPage() {
  const { currentCustomer } = useAuth();
  const [spending, setSpending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetInput, setBudgetInput] = useState('500');
  const [recurringAmountInput, setRecurringAmountInput] = useState('50');
  const [recurringEnabled, setRecurringEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!currentCustomer?.email) return;
    setLoading(true);
    getCustomerSpending(currentCustomer.email)
      .then((data) => {
        setSpending(data);
        if (data) {
          setBudgetInput((data.monthlyBudgetLimitCents / 100).toString());
          setRecurringAmountInput(((data.recurringContribution?.amountCents || 5000) / 100).toString());
          setRecurringEnabled(data.recurringContribution?.enabled ?? true);
        }
      })
      .catch((e) => console.warn(e.message))
      .finally(() => setLoading(false));
  }, [currentCustomer]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateSpendingSettings({
        customerEmail: currentCustomer.email,
        monthlyBudgetLimitCents: Math.round(Number(budgetInput) * 100),
        recurringContribution: {
          enabled: recurringEnabled,
          amountCents: Math.round(Number(recurringAmountInput) * 100),
          status: recurringEnabled ? 'ACTIVE' : 'PAUSED',
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading account settings..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">Account & Spending Settings</h1>
        <p className="text-xs text-slate-500">
          Configure your personal monthly allowance, recurring contributions, and shopper profile.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Spending settings updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shopper Profile */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Shopper Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={currentCustomer?.name}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Billing Email</label>
              <input
                type="email"
                disabled
                value={currentCustomer?.email}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Monthly Spending Allowance Configuration */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Monthly Spending Allowance</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Monthly Target Budget Limit ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your monthly spending envelope for fresh groceries and pantry items.
              </p>
            </div>
          </div>
        </div>

        {/* Recurring Contribution Configuration */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Recurring Monthly Contribution (PayPal)</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Auto-Contribute Monthly</p>
                <p className="text-[11px] text-slate-500">
                  Automatically tops up your allowance every 30 days using your connected PayPal account.
                </p>
              </div>
              <input
                type="checkbox"
                checked={recurringEnabled}
                onChange={(e) => setRecurringEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {recurringEnabled && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Contribution Amount ($ USD / month)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={recurringAmountInput}
                    onChange={(e) => setRecurringAmountInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}

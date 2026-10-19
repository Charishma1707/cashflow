import React from 'react';
import { X, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import PayPalExpenseCheckoutButton from './PayPalExpenseCheckoutButton';
import { formatMoney } from '../services/api';

export default function SubscriptionPayModal({ expense, isOpen, onClose, onPaymentSuccess }) {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pay Operating Subscription
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {expense.platform || expense.vendor} • {expense.frequency || 'Monthly'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Subscription / Tool</span>
              <span className="text-xs font-bold text-slate-900">{expense.description}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Vendor / Platform</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                {expense.platform || expense.vendor}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Billing Cadence</span>
              <span className="text-xs font-medium text-slate-700">{expense.frequency || 'MONTHLY'}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Total Due</span>
              <span className="text-lg font-extrabold text-blue-600">
                {formatMoney(expense.amount)}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-150">
            <p>
              💡 This software license is required to fulfill client projects. Settle directly through PayPal Sandbox to record the transaction and update your cash burn ledger.
            </p>
          </div>

          {/* Checkout Button */}
          <PayPalExpenseCheckoutButton
            expense={expense}
            onPaymentSuccess={(res) => {
              if (onPaymentSuccess) onPaymentSuccess(res);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

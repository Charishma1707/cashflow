import React from 'react';
import { CheckCircle2, X, ExternalLink, ShieldCheck, Copy, ArrowRight } from 'lucide-react';
import { formatMoney } from '../services/api';

export default function PaymentReceiptModal({ result, onClose, onViewInvoice }) {
  if (!result || !result.payment) return null;

  const { payment, invoice } = result;

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-emerald-500/40 shadow-2xl p-6 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-bold text-white">Payment Captured!</h3>
        <p className="text-xs text-slate-400 mt-1">
          PayPal Sandbox payment was successfully verified and recorded.
        </p>

        {/* Amount Box */}
        <div className="my-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Amount Collected</span>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {formatMoney(payment.amount, payment.currency)}
          </div>
          <div className="mt-2 flex items-center justify-center space-x-1 text-[11px] text-emerald-400/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Status: COMPLETED (Verified via PayPal REST API)</span>
          </div>
        </div>

        {/* Transaction details ledger */}
        <div className="space-y-2 text-left text-xs bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-400">
            <span>Invoice:</span>
            <span className="font-mono text-white font-semibold">
              {invoice?.invoiceNumber || 'Invoice'}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>PayPal Order ID:</span>
            <span className="font-mono text-slate-300 truncate max-w-[170px]">
              {payment.paypalOrderId}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Capture ID:</span>
            <span className="font-mono text-cyan-400 truncate max-w-[170px]">
              {payment.paypalCaptureId}
            </span>
          </div>

          {payment.payer?.name && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Payer Name:</span>
              <span className="text-slate-300">{payment.payer.name}</span>
            </div>
          )}

          {payment.payer?.email && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Payer Email:</span>
              <span className="text-slate-300">{payment.payer.email}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
            <span className="text-slate-400 font-medium">Remaining Balance:</span>
            <span className="font-mono font-bold text-white">
              {formatMoney(invoice?.outstandingBalance || 0)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
          {onViewInvoice && (
            <button
              onClick={() => {
                onClose();
                onViewInvoice(invoice);
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1"
            >
              <span>View Invoice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

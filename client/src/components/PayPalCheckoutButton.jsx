import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { createPayPalOrder, capturePayPalOrder, formatMoney } from '../services/api';
import { AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';

export default function PayPalCheckoutButton({ invoice, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  // Vite environment variable
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim();

  // Eligibility check
  const isPaid = invoice.status === 'PAID' || invoice.outstandingBalance <= 0;
  const isCancelled = invoice.status === 'CANCELLED';
  const isDraft = invoice.status === 'DRAFT';
  const isPayable = !isPaid && !isCancelled && !isDraft;

  if (isPaid) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-3">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold">Invoice Fully Settled</p>
          <p className="text-emerald-600 mt-0.5">This invoice has no outstanding balance.</p>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center space-x-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold text-slate-800">Invoice Cancelled</p>
          <p className="mt-0.5">Payments cannot be accepted for voided invoices.</p>
        </div>
      </div>
    );
  }

  if (isDraft) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center space-x-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold">Invoice in Draft Mode</p>
          <p className="text-amber-700 mt-0.5">Please send this invoice to client before collecting payments.</p>
        </div>
      </div>
    );
  }

  // If Client ID is not configured yet, provide clear instruction box
  if (!clientId || clientId === 'your_sandbox_client_id_here' || clientId.length < 10) {
    return (
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-700 space-y-2">
        <div className="flex items-center space-x-2 text-blue-700 font-semibold text-xs">
          <KeyRound className="w-4 h-4" />
          <span>PayPal Sandbox Setup Required</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          To initiate real Sandbox checkout for <strong className="text-slate-900">{formatMoney(invoice.outstandingBalance)}</strong>:
        </p>
        <ol className="text-[11px] text-slate-700 list-decimal list-inside space-y-1 bg-white p-2.5 rounded-lg border border-blue-150 font-mono shadow-2xs">
          <li>Get credentials at <span className="text-blue-600 font-semibold">developer.paypal.com</span></li>
          <li>Set <span className="text-blue-600 font-semibold">VITE_PAYPAL_CLIENT_ID</span> in client/.env</li>
          <li>Set <span className="text-blue-600 font-semibold">PAYPAL_CLIENT_ID</span> & <span className="text-blue-600 font-semibold">PAYPAL_CLIENT_SECRET</span> in server/.env</li>
        </ol>
      </div>
    );
  }

  const initialOptions = {
    clientId: clientId,
    currency: 'USD',
    intent: 'capture',
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      setCancelled(false);

      // Call our backend to create order with server-calculated amount
      const data = await createPayPalOrder(invoice._id);
      return data.orderId;
    } catch (err) {
      console.error('Failed to create order on server:', err);
      const msg = err.response?.data?.error || err.message || 'Could not initialize PayPal order';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (data) => {
    try {
      setLoading(true);
      setError(null);

      // Call our backend to capture order and record payment idempotently
      const result = await capturePayPalOrder(data.orderID, invoice._id);

      if (onPaymentSuccess) {
        onPaymentSuccess(result);
      }
    } catch (err) {
      console.error('Failed to capture PayPal order on backend:', err);
      const msg = err.response?.data?.error || err.message || 'Payment capture failed on server';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCancelled(true);
  };

  const handleError = (err) => {
    console.error('PayPal Checkout error:', err);
    setError(err?.message || 'An error occurred during PayPal checkout.');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
        <span>Payment Method</span>
        <span className="font-semibold text-slate-800">PayPal Sandbox Checkout</span>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 block">Amount to Charge</span>
          <span className="text-base font-bold text-blue-600 font-mono">
            {formatMoney(invoice.outstandingBalance)}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 text-right">
          <span>Server-verified</span>
          <div className="flex items-center space-x-1 text-emerald-600 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tamper-proof</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-3 text-xs text-blue-700 bg-blue-50 rounded-xl border border-blue-200 font-medium">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span>Processing transaction with PayPal...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Payment Failed</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Checkout window was closed or cancelled.</span>
        </div>
      )}

      {isPayable && (
        <div className="pt-2">
          <PayPalScriptProvider options={initialOptions}>
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'pay',
                height: 42,
              }}
              createOrder={handleCreateOrder}
              onApprove={handleApprove}
              onCancel={handleCancel}
              onError={handleError}
            />
          </PayPalScriptProvider>
        </div>
      )}
    </div>
  );
}

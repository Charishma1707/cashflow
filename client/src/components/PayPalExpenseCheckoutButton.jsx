import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { createExpensePayPalOrder, captureExpensePayPalOrder, formatMoney } from '../services/api';
import { AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';

export default function PayPalExpenseCheckoutButton({ expense, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim();

  if (expense.status === 'PAID') {
    return (
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-2.5">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
        <div className="text-xs">
          <span className="font-semibold">Subscription Paid & Active</span>
          {expense.paypalCaptureId && (
            <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
              Capture ID: {expense.paypalCaptureId}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!clientId || clientId === 'your_sandbox_client_id_here' || clientId.length < 10) {
    return (
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center space-x-2">
        <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
        <span>Configure VITE_PAYPAL_CLIENT_ID to pay {expense.platform || expense.vendor} with PayPal.</span>
      </div>
    );
  }

  const initialOptions = {
    clientId,
    currency: 'USD',
    intent: 'capture',
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      setCancelled(false);

      const data = await createExpensePayPalOrder(expense._id);
      return data.orderId;
    } catch (err) {
      console.error('Failed to create expense order on server:', err);
      const msg = err.response?.data?.error || err.message || 'Could not initialize PayPal subscription payment';
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

      const result = await captureExpensePayPalOrder(data.orderId, expense._id);
      if (onPaymentSuccess) {
        onPaymentSuccess(result);
      }
    } catch (err) {
      console.error('Failed to capture expense payment on server:', err);
      const msg = err.response?.data?.error || err.message || 'Payment approval succeeded but server capture failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Payment Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Checkout window closed. You can retry payment at any time.</span>
        </div>
      )}

      <PayPalScriptProvider options={initialOptions}>
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Pay {expense.platform || expense.vendor} Subscription:
            </span>
            <span className="text-sm font-bold text-slate-900">
              {formatMoney(expense.amount)}
            </span>
          </div>

          <PayPalButtons
            style={{
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'pay',
              height: 40,
            }}
            disabled={loading}
            createOrder={handleCreateOrder}
            onApprove={handleApprove}
            onCancel={() => setCancelled(true)}
            onError={(err) => {
              console.error('PayPal button error:', err);
              setError(err.message || 'PayPal encounter an unexpected checkout error');
            }}
          />

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 font-medium mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure PayPal Sandbox Checkout</span>
          </div>
        </div>
      </PayPalScriptProvider>
    </div>
  );
}

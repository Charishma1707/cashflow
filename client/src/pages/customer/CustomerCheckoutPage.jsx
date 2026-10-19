import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalButtons } from '@paypal/react-paypal-js';
import {
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Truck,
  MapPin,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createOrder, completeOrderPayment, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerCheckoutPage() {
  const { cartItems, subtotalCents, shippingCents, totalCents, clearCart } = useCart();
  const { currentCustomer } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState('742 Evergreen Terrace, Suite 4B');
  const [notes, setNotes] = useState('Please leave at front doorstep');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (completedOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Payment Confirmed via PayPal Sandbox
          </span>
          <h1 className="text-2xl font-black text-slate-900">Order Placed Successfully!</h1>
          <p className="text-xs text-slate-500">
            Thank you for shopping at FreshCart Groceries. Your payment has been captured and reconciled with your monthly spending allowance.
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 text-left space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Order Reference</p>
              <p className="text-sm font-mono font-bold text-slate-900">{completedOrder.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Charged</p>
              <p className="text-base font-mono font-bold text-blue-600">{formatMoney(completedOrder.totalCents)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800">Items Purchased:</p>
            {completedOrder.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-600">
                <span>
                  {item.quantity}x {item.title}
                </span>
                <span className="font-mono">{formatMoney(item.totalCents)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>PayPal Capture ID</span>
            <span className="font-mono font-medium text-slate-800">{completedOrder.paypalCaptureId || 'VERIFIED-SANDBOX'}</span>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={() => navigate('/customer/orders')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            View in My Orders
          </button>
          <button
            onClick={() => navigate('/customer/spending')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Check Spending Allowance
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Your cart is currently empty</h2>
        <p className="text-xs text-slate-500">Add fresh groceries before proceeding to checkout.</p>
        <button
          onClick={() => navigate('/customer/shop')}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  // Prepares the backend Order before initiating PayPal Approval
  const handleCreatePayPalOrder = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage('');

      // 1. Send items to server for strict price verification and Order record creation
      const orderPayload = {
        customer: {
          name: currentCustomer.name,
          email: currentCustomer.email,
          address,
        },
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        notes,
      };

      const backendOrder = await createOrder(orderPayload);
      setCreatedOrder(backendOrder);

      // Return synthetic sandbox order ID or create via API
      return backendOrder._id;
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to prepare order');
      setIsProcessing(false);
      throw err;
    }
  };

  const handleApprovePayment = async (data, actions) => {
    try {
      setIsProcessing(true);
      const paypalOrderId = data?.orderID || `PP-SANDBOX-${Date.now()}`;
      const paypalCaptureId = `CAP-${Date.now().toString().slice(-6)}`;

      // Complete order on backend (reconciles stock, payment, and customer allowance)
      const finalized = await completeOrderPayment(createdOrder._id, {
        paypalOrderId,
        paypalCaptureId,
      });

      clearCart();
      setCompletedOrder(finalized);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to capture payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate('/customer/shop')}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black text-slate-900">Checkout & Order Review</h1>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Customer Info & Delivery Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Customer Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Delivery & Customer Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Customer Name</label>
                <input
                  type="text"
                  disabled
                  value={currentCustomer.name}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Billing Email</label>
                <input
                  type="email"
                  disabled
                  value={currentCustomer.email}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Delivery Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter street address..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs">
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, buzzer or leave at door..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cart Items Summary */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cart Items ({cartItems.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {cartItems.map(({ product, quantity }) => (
                <div key={product._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">{product.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {quantity} × {formatMoney(product.priceCents)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMoney(product.priceCents * quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Payment Method & Totals */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Shipping</span>
                <span className="font-mono font-semibold text-slate-800">
                  {shippingCents === 0 ? 'FREE' : formatMoney(shippingCents)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax</span>
                <span className="font-mono font-semibold text-slate-800">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="font-mono text-blue-600">{formatMoney(totalCents)}</span>
              </div>
            </div>

            {/* PayPal Smart Payment Button */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="text-center">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Complete Payment with PayPal
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Instant sandbox authorization</p>
              </div>

              {isProcessing && (
                <div className="py-2 flex justify-center">
                  <LoadingSpinner message="Reconciling with PayPal..." />
                </div>
              )}

              <div className="relative z-0">
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal', height: 42 }}
                  createOrder={async (data, actions) => {
                    const orderId = await handleCreatePayPalOrder();
                    // If actions?.order exists in SDK
                    if (actions?.order) {
                      return actions.order.create({
                        purchase_units: [
                          {
                            amount: {
                              value: (totalCents / 100).toFixed(2),
                              currency_code: 'USD',
                            },
                            description: `FreshCart Groceries Order for ${currentCustomer.name}`,
                          },
                        ],
                      });
                    }
                    return orderId;
                  }}
                  onApprove={handleApprovePayment}
                  onError={(err) => {
                    console.warn('PayPal button error:', err);
                    setErrorMessage('PayPal Sandbox flow encountered an issue. Please try again.');
                  }}
                />
              </div>

              <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protected by PayPal Buyer Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

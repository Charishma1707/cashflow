import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Send,
} from 'lucide-react';
import { formatMoney, updateInvoiceStatus } from '../services/api';
import PayPalCheckoutButton from './PayPalCheckoutButton';

export default function InvoiceDetailModal({
  invoice,
  onClose,
  onPaymentSuccess,
  onStatusUpdated,
}) {
  const [updating, setUpdating] = useState(false);

  if (!invoice) return null;

  const statusBadges = {
    PAID: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'PAID' },
    PARTIALLY_PAID: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', label: 'PARTIALLY PAID' },
    SENT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'SENT' },
    OVERDUE: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', label: 'OVERDUE' },
    DRAFT: { bg: 'bg-slate-700/40', text: 'text-slate-300', border: 'border-slate-600/40', label: 'DRAFT' },
    CANCELLED: { bg: 'bg-slate-800/80', text: 'text-slate-400', border: 'border-slate-700', label: 'CANCELLED' },
  };

  const currentBadge = statusBadges[invoice.status] || statusBadges.SENT;

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      const updated = await updateInvoiceStatus(invoice._id, newStatus);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700/70 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white font-mono">{invoice.invoiceNumber}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}
                >
                  {currentBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Issued {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Client & Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Billed To
              </span>
              <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{invoice.customer?.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{invoice.customer?.email}</span>
              </div>
              {invoice.customer?.address && (
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{invoice.customer.address}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Payment Terms & Due Date
              </span>
              <div className="flex items-center space-x-2 text-sm text-slate-200">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Due Date:</span>
                <span className="font-semibold text-white">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {new Date() > new Date(invoice.dueDate) && invoice.status !== 'PAID' ? (
                  <span className="text-rose-400 font-medium flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Past due date</span>
                  </span>
                ) : (
                  <span>Net payment terms</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Line Items
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-medium text-slate-200">{item.description}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-white font-mono">
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">{formatMoney(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span className="font-mono text-slate-200">{formatMoney(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800 text-sm">
                <span>Total Amount:</span>
                <span className="font-mono">{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Paid to Date:</span>
                <span className="font-mono">-{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-cyan-400 pt-2 border-t border-slate-800 text-sm">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatMoney(invoice.outstandingBalance)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Notes
              </span>
              <p className="text-slate-300">{invoice.notes}</p>
            </div>
          )}

          {/* PayPal Checkout Area */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>Collect Payment</span>
            </h4>
            <PayPalCheckoutButton
              invoice={invoice}
              onPaymentSuccess={(paymentResult) => {
                if (onPaymentSuccess) onPaymentSuccess(paymentResult);
              }}
            />
          </div>

          {/* Payment History List */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Recorded Payments ({invoice.paymentHistory.length})
              </h4>
              <div className="space-y-2">
                {invoice.paymentHistory.map((p, idx) => (
                  <div
                    key={p._id || idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-emerald-400">
                          {formatMoney(p.amount, p.currency)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                          {p.provider || 'PAYPAL'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Capture ID: {p.paypalCaptureId || p._id}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(p.transactionDate || p.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {invoice.status === 'DRAFT' && (
              <button
                disabled={updating}
                onClick={() => handleStatusChange('SENT')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mark as Sent</span>
              </button>
            )}
            {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
              <button
                disabled={updating}
                onClick={() => handleStatusChange('CANCELLED')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Invoice</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

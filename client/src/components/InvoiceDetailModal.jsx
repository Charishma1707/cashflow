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
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'PAID' },
    PARTIALLY_PAID: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'PARTIALLY PAID' },
    SENT: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'SENT' },
    OVERDUE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'OVERDUE' },
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'DRAFT' },
    CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'CANCELLED' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}
                >
                  {currentBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Issued {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Client & Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Billed To
              </span>
              <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{invoice.customer?.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{invoice.customer?.email}</span>
              </div>
              {invoice.customer?.address && (
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{invoice.customer.address}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Payment Terms & Due Date
              </span>
              <div className="flex items-center space-x-2 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Due Date:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {new Date() > new Date(invoice.dueDate) && invoice.status !== 'PAID' ? (
                  <span className="text-rose-600 font-medium flex items-center space-x-1">
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Line Items
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
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
            <div className="w-72 space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800 font-medium">{formatMoney(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span className="font-mono text-slate-800 font-medium">{formatMoney(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                <span>Total Amount:</span>
                <span className="font-mono">{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Paid to Date:</span>
                <span className="font-mono">-{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-600 pt-2 border-t border-slate-200 text-sm">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatMoney(invoice.outstandingBalance)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Notes
              </span>
              <p className="text-slate-700">{invoice.notes}</p>
            </div>
          )}

          {/* PayPal Checkout Area */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3 flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
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
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Recorded Payments ({invoice.paymentHistory.length})
              </h4>
              <div className="space-y-2">
                {invoice.paymentHistory.map((p, idx) => (
                  <div
                    key={p._id || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-emerald-600">
                          {formatMoney(p.amount, p.currency)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-700 border border-blue-200 font-semibold">
                          {p.provider || 'PAYPAL'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Capture ID: {p.paypalCaptureId || p._id}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(p.transactionDate || p.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {invoice.status === 'DRAFT' && (
              <button
                disabled={updating}
                onClick={() => handleStatusChange('SENT')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mark as Sent</span>
              </button>
            )}
            {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
              <button
                disabled={updating}
                onClick={() => handleStatusChange('CANCELLED')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Invoice</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

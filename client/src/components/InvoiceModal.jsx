import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, User, Mail, DollarSign } from 'lucide-react';
import { createInvoice, formatMoney } from '../services/api';

export default function InvoiceModal({ onClose, onInvoiceCreated }) {
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 14 days
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('Payment terms: Net 14. Payable via PayPal.');
  const [status, setStatus] = useState('SENT');
  const [items, setItems] = useState([
    { description: 'Product Design & Strategy', quantity: 1, unitPrice: 2500 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'quantity' || field === 'unitPrice' ? Number(value) : value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  // Calculations in decimal dollars
  const subtotal = items.reduce((acc, curr) => acc + (curr.quantity || 0) * (curr.unitPrice || 0), 0);
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name.trim() || !customer.email.trim()) {
      setError('Customer name and email are required');
      return;
    }
    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      setError('All items must have a valid description and positive price');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const invoiceData = {
        customer,
        dueDate,
        items,
        taxRate: Number(taxRate) || 0,
        notes,
        status,
      };

      const newInvoice = await createInvoice(invoiceData);
      if (onInvoiceCreated) {
        onInvoiceCreated(newInvoice);
      }
      onClose();
    } catch (err) {
      console.error('Invoice creation failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create New Invoice</h3>
            <p className="text-xs text-slate-500 font-medium">Generate an invoice with custom line items and terms</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {/* Client Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Customer / Company Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, Acme Corp"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">Customer Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="billing@company.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Billing Address (Optional)</label>
              <input
                type="text"
                placeholder="123 Financial Way, San Francisco, CA"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
              />
            </div>
          </div>

          {/* Invoice Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Due Date *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-600 font-bold block mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
              >
                <option value="SENT">SENT (Ready for Payment)</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Line Items
              </h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Item description..."
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-center focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-right focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-bold text-slate-900 px-2">
                    ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Totals */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <div className="w-64 space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800 font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Tax (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-right text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-blue-600 font-extrabold">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-600 font-bold block mb-1">Notes & Terms</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs resize-none"
            ></textarea>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


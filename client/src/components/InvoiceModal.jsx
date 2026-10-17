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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Create New Invoice</h3>
            <p className="text-xs text-slate-400">Generate an invoice with custom line items and terms</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {error}
            </div>
          )}

          {/* Client Details */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Customer / Company Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, Acme Corp"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Customer Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="billing@company.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Billing Address (Optional)</label>
              <input
                type="text"
                placeholder="123 Financial Way, San Francisco, CA"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Invoice Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-slate-400 block mb-1">Due Date *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="SENT">SENT (Ready for Payment)</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Line Items
              </h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Item description..."
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-center focus:outline-none focus:border-cyan-500"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1.5 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-semibold text-white px-2">
                    ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Totals */}
          <div className="flex justify-end pt-2 border-t border-slate-800">
            <div className="w-64 space-y-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Tax (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-slate-800">
                <span>Total:</span>
                <span className="font-mono text-cyan-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-400 block mb-1">Notes & Terms</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
            ></textarea>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

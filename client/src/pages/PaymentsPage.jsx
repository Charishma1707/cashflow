import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getPayments, formatMoney } from '../services/api';

export default function PaymentsPage({ onSelectInvoice }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getPayments();
      setPayments(list);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.paypalCaptureId?.toLowerCase().includes(term) ||
      p.paypalOrderId?.toLowerCase().includes(term) ||
      p.invoiceId?.invoiceNumber?.toLowerCase().includes(term) ||
      p.payer?.name?.toLowerCase().includes(term) ||
      p.payer?.email?.toLowerCase().includes(term)
    );
  });

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Payment Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Idempotent Audit Log
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Settled transactions, PayPal Sandbox capture proofs, and payer records
          </p>
        </div>

        {/* Total Collected Pill */}
        <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 flex items-center space-x-3 self-start md:self-auto">
          <div>
            <span className="text-[11px] text-slate-400 block">Total Payments Collected</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {formatMoney(totalCollected)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter by capture ID, invoice #, payer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Ledger Table */}
      {loading ? (
        <LoadingSpinner text="Loading payment ledger..." />
      ) : error ? (
        <div className="glass-panel p-6 rounded-2xl text-center border border-rose-500/30">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No recorded payments found"
          description={
            searchTerm
              ? 'No transactions matched your search query.'
              : 'Payments will appear here immediately after a customer settles an invoice via PayPal Sandbox.'
          }
        />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Transaction / Capture ID</th>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Payer</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-mono text-cyan-400 font-semibold">
                        <span>{p.paypalCaptureId || p._id}</span>
                        {p.paypalCaptureId && (
                          <button
                            onClick={() => handleCopy(p.paypalCaptureId)}
                            title="Copy Capture ID"
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {p.paypalOrderId && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Order: {p.paypalOrderId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.invoiceId ? (
                        <button
                          onClick={() => onSelectInvoice && onSelectInvoice(p.invoiceId)}
                          className="font-mono text-white hover:text-cyan-400 font-semibold cursor-pointer underline decoration-dotted"
                        >
                          {p.invoiceId.invoiceNumber || 'View Invoice'}
                        </button>
                      ) : (
                        <span className="text-slate-400">Direct Payment</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{p.payer?.name || 'PayPal Customer'}</div>
                      {p.payer?.email && (
                        <span className="text-[11px] text-slate-400">{p.payer.email}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                        <span>{p.provider || 'PAYPAL'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.transactionDate || p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      +{formatMoney(p.amount, p.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

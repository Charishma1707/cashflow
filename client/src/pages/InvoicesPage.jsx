import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  CreditCard,
  Eye,
  Sparkles,
  Table,
  LayoutGrid,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import AgGridInvoices from '../components/AgGridInvoices';
import NudgeBotModal from '../components/NudgeBotModal';
import { getInvoices, formatMoney } from '../services/api';

const STATUS_FILTERS = ['ALL', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DRAFT', 'CANCELLED'];

export default function InvoicesPage({ onOpenInvoiceModal, onSelectInvoice }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // View toggle: 'ag-grid' or 'standard'
  const [viewMode, setViewMode] = useState('ag-grid');
  const [isNudgeBotOpen, setIsNudgeBotOpen] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const list = await getInvoices(params);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInvoices();
  };

  const getStatusBadge = (status) => {
    const config = {
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
      PARTIALLY_PAID: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
      SENT: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
      OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
      CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 font-bold',
    };
    return config[status] || config.SENT;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoices</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              AG Grid Powered
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage billing, trigger PayPal Sandbox payments, and launch AI Nudges
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          {/* AI Nudge-Bot Button */}
          <button
            onClick={() => setIsNudgeBotOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Nudge-Bot</span>
          </button>

          {/* New Invoice Button */}
          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* View Toggle (AG Grid vs Standard) */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
          <button
            onClick={() => setViewMode('ag-grid')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'ag-grid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>AG Grid View</span>
          </button>

          <button
            onClick={() => setViewMode('standard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'standard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Standard Table</span>
          </button>
        </div>
      </div>

      {/* Main Grid or Table */}
      {loading ? (
        <LoadingSpinner text="Loading invoices into AG Grid..." />
      ) : error ? (
        <div className="bg-white p-6 rounded-2xl text-center border border-rose-200 shadow-xs">
          <p className="text-xs text-rose-600 font-semibold">{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices found"
          description={
            statusFilter !== 'ALL' || searchTerm
              ? 'Try adjusting your filters.'
              : 'Create your first invoice to start accepting client payments.'
          }
          actionText="Create Invoice"
          onAction={onOpenInvoiceModal}
        />
      ) : viewMode === 'ag-grid' ? (
        <AgGridInvoices
          invoices={invoices}
          onSelectInvoice={onSelectInvoice}
          onOpenNudgeBot={() => setIsNudgeBotOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{inv.customer?.name}</div>
                      <span className="text-[11px] text-slate-400 font-medium">{inv.customer?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          inv.status === 'OVERDUE'
                            ? 'text-rose-600 font-bold'
                            : 'text-slate-600 font-medium'
                        }
                      >
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatMoney(inv.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">
                      {formatMoney(inv.outstandingBalance)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-2xs cursor-pointer transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay with PayPal</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Nudge-Bot Modal */}
      {isNudgeBotOpen && (
        <NudgeBotModal
          invoices={invoices}
          onClose={() => setIsNudgeBotOpen(false)}
          onSelectInvoice={(inv) => {
            setIsNudgeBotOpen(false);
            onSelectInvoice(inv);
          }}
        />
      )}
    </div>
  );
}

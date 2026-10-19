import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Receipt,
  Clock,
  DollarSign,
  User,
  ArrowRight,
  Filter,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  getServiceRequests,
  updateServiceRequestStatus,
  convertServiceRequestToInvoice,
  formatMoney,
} from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ServiceRequestsPage({ onOpenInvoiceModal }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getServiceRequests('', filterStatus === 'ALL' ? '' : filterStatus);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleConvert = async (reqId) => {
    try {
      setActionLoadingId(reqId);
      const res = await convertServiceRequestToInvoice(reqId);
      alert(`✅ Success: ${res.message}! Client can now settle invoice via PayPal.`);
      loadRequests();
    } catch (err) {
      console.error('Failed to convert to invoice:', err);
      alert(err.response?.data?.error || err.message || 'Failed to convert request to invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (reqId, newStatus) => {
    try {
      setActionLoadingId(reqId);
      await updateServiceRequestStatus(reqId, newStatus);
      loadRequests();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPipelineCents = requests.reduce((acc, r) => acc + (r.budgetInCents || 0), 0);
  const pendingReviewCount = requests.filter((r) => r.status === 'PENDING_REVIEW').length;
  const invoicedCount = requests.filter((r) => r.status === 'INVOICED' || r.status === 'PAID').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase">
              Client Service Orders
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Merchant Inbox</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Service Requests & Project Orders
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Incoming work requested by clients. Convert requests directly into payable PayPal invoices.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center space-x-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-2xs">
            {['ALL', 'PENDING_REVIEW', 'APPROVED', 'INVOICED', 'PAID'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={loadRequests}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Service Pipeline"
          value={formatMoney(totalPipelineCents)}
          subtitle="Cumulative requested volume"
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title="Pending Review"
          value={pendingReviewCount.toString()}
          subtitle="Awaiting scope approval or invoice"
          icon={Clock}
          variant={pendingReviewCount > 0 ? 'warning' : 'success'}
        />

        <StatCard
          title="Billed & Invoiced"
          value={invoicedCount.toString()}
          subtitle="Converted to PayPal invoices"
          icon={Receipt}
          variant="success"
        />
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900">
          Client Requests ({requests.length})
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner text="Loading incoming service orders..." />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No service requests found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-slate-900">
                      {req.serviceTitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {req.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'INVOICED'
                          ? 'bg-purple-100 text-purple-800'
                          : req.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center space-x-1 text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <strong>{req.customer?.name}</strong> ({req.customer?.email})
                    </span>
                    {req.customer?.company && (
                      <span>• Company: {req.customer.company}</span>
                    )}
                    <span>• Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      {formatMoney(req.budgetInCents)}
                    </span>
                  </div>

                  {req.status !== 'INVOICED' && req.status !== 'PAID' && (
                    <button
                      onClick={() => handleConvert(req._id)}
                      disabled={actionLoadingId === req._id}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Convert to Invoice</span>
                    </button>
                  )}

                  {req.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => handleStatusChange(req._id, 'APPROVED')}
                      disabled={actionLoadingId === req._id}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}

                  {req.status === 'INVOICED' && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Invoice Issued</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

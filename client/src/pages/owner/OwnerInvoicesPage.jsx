import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { getInvoices, formatMoney } from '../../services/api';
import AgGridInvoices from '../../components/AgGridInvoices';
import InvoiceDetailModal from '../../components/InvoiceDetailModal';
import NudgeBotModal from '../../components/NudgeBotModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerInvoicesPage() {
  const { setIsInvoiceModalOpen } = useOutletContext() || {};
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isNudgeBotOpen, setIsNudgeBotOpen] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data || []);
    } catch (err) {
      console.warn('Failed to load owner invoices:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
  const totalOverdueBalance = overdueInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Invoices Hub & Accounts Receivable</h1>
          <p className="text-xs text-slate-500">
            Issue invoices to cafe & restaurant accounts, collect payments via PayPal, and send automated reminders.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {overdueInvoices.length > 0 && (
            <button
              onClick={() => setIsNudgeBotOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Remind Overdue ({overdueInvoices.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsInvoiceModalOpen && setIsInvoiceModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading invoice records..." />
        </div>
      ) : (
        <AgGridInvoices
          invoices={invoices}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          onOpenNudgeBot={() => setIsNudgeBotOpen(true)}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onStatusUpdated={() => {
            loadInvoices();
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* AI Nudge Bot Modal */}
      {isNudgeBotOpen && (
        <NudgeBotModal
          invoices={invoices}
          onClose={() => setIsNudgeBotOpen(false)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInvoices, formatMoney } from '../../services/api';
import AgGridInvoices from '../../components/AgGridInvoices';
import InvoiceDetailModal from '../../components/InvoiceDetailModal';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerInvoicesPage() {
  const { currentCustomer } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const loadInvoices = async () => {
    if (!currentCustomer?.email) return;
    setLoading(true);
    try {
      const data = await getInvoices({ email: currentCustomer.email });
      setInvoices(data || []);
    } catch (err) {
      console.warn('Failed to load customer invoices:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [currentCustomer]);

  const handlePaymentSuccess = (receipt) => {
    setSelectedInvoice(null);
    setPaymentReceipt(receipt);
    loadInvoices();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">My Invoices</h1>
        <p className="text-xs text-slate-500">
          Review invoices issued to <strong className="text-slate-700">{currentCustomer?.email}</strong> and complete payments directly through PayPal.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Retrieving your invoices..." />
        </div>
      ) : (
        <AgGridInvoices
          invoices={invoices}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
        />
      )}

      {/* Invoice Detail / Payment Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentSuccess={handlePaymentSuccess}
          onStatusUpdated={() => {
            loadInvoices();
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Payment Receipt Modal */}
      {paymentReceipt && (
        <PaymentReceiptModal
          result={paymentReceipt}
          onClose={() => setPaymentReceipt(null)}
        />
      )}
    </div>
  );
}

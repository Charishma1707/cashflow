import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import ExpensesPage from './pages/ExpensesPage';
import PaymentsPage from './pages/PaymentsPage';
import SettingsPage from './pages/SettingsPage';
import McpAssistantPage from './pages/McpAssistantPage';
import InvoiceModal from './components/InvoiceModal';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import ExpenseModal from './components/ExpenseModal';
import PaymentReceiptModal from './components/PaymentReceiptModal';
import { getBusinessSettings, getPayPalStatus } from './services/api';

function AppContent() {
  const [business, setBusiness] = useState(null);
  const [paypalStatus, setPaypalStatus] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const navigate = useNavigate();

  const refreshGlobalData = async (attempt = 1) => {
    try {
      const [biz, pp] = await Promise.all([getBusinessSettings(), getPayPalStatus()]);
      if (biz) setBusiness(biz);
      if (pp) setPaypalStatus(pp);
    } catch (err) {
      console.warn('Initial data load warning:', err.message);
      if (attempt < 4) {
        setTimeout(() => refreshGlobalData(attempt + 1), 4000);
      }
    }
  };

  useEffect(() => {
    refreshGlobalData();
  }, [refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePaymentSuccess = (result) => {
    // 1. Close invoice detail modal
    setSelectedInvoice(null);
    // 2. Open payment celebratory receipt modal
    setPaymentReceipt(result);
    // 3. Trigger global data refresh
    triggerRefresh();
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-500/20 selection:text-blue-600">
      {/* Persistent Left Sidebar */}
      <Sidebar business={business} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          business={business}
          paypalStatus={paypalStatus}
          onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  key={`dash-${refreshTrigger}`}
                  onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
                  onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  onDataLoaded={(summary) => {
                    if (summary?.business) setBusiness(summary.business);
                  }}
                />
              }
            />
            <Route
              path="/assistant"
              element={
                <McpAssistantPage
                  onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
                />
              }
            />
            <Route
              path="/invoices"
              element={
                <InvoicesPage
                  key={`inv-${refreshTrigger}`}
                  onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                />
              }
            />
            <Route
              path="/expenses"
              element={
                <ExpensesPage
                  key={`exp-${refreshTrigger}`}
                  onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                />
              }
            />
            <Route
              path="/payments"
              element={
                <PaymentsPage
                  key={`pay-${refreshTrigger}`}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  onSettingsUpdated={(updated) => {
                    setBusiness(updated);
                    triggerRefresh();
                  }}
                />
              }
            />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          onClose={() => setIsInvoiceModalOpen(false)}
          onInvoiceCreated={(newInv) => {
            triggerRefresh();
            setSelectedInvoice(newInv);
          }}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
          onExpenseCreated={() => {
            triggerRefresh();
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentSuccess={handlePaymentSuccess}
          onStatusUpdated={(updated) => {
            setSelectedInvoice(updated);
            triggerRefresh();
          }}
        />
      )}

      {paymentReceipt && (
        <PaymentReceiptModal
          result={paymentReceipt}
          onClose={() => setPaymentReceipt(null)}
          onViewInvoice={(inv) => {
            setSelectedInvoice(inv);
            navigate('/invoices');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

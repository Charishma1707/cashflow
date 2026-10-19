import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import OwnerLayout from './layouts/OwnerLayout';

// Gateway
import WelcomeGatewayPage from './pages/WelcomeGatewayPage';

// Customer Pages
import CustomerHomePage from './pages/customer/CustomerHomePage';
import CustomerShopPage from './pages/customer/CustomerShopPage';
import CustomerCheckoutPage from './pages/customer/CustomerCheckoutPage';
import CustomerOrdersPage from './pages/customer/CustomerOrdersPage';
import CustomerPaymentsPage from './pages/customer/CustomerPaymentsPage';
import CustomerInvoicesPage from './pages/customer/CustomerInvoicesPage';
import CustomerSpendingPage from './pages/customer/CustomerSpendingPage';
import CustomerAiPage from './pages/customer/CustomerAiPage';
import CustomerSettingsPage from './pages/customer/CustomerSettingsPage';

// Owner Pages
import OwnerOverviewPage from './pages/owner/OwnerOverviewPage';
import OwnerProductsPage from './pages/owner/OwnerProductsPage';
import OwnerOrdersPage from './pages/owner/OwnerOrdersPage';
import OwnerTransactionsPage from './pages/owner/OwnerTransactionsPage';
import OwnerCustomersPage from './pages/owner/OwnerCustomersPage';
import OwnerInvoicesPage from './pages/owner/OwnerInvoicesPage';
import OwnerCashFlowPage from './pages/owner/OwnerCashFlowPage';
import OwnerAnalyticsPage from './pages/owner/OwnerAnalyticsPage';
import OwnerAiPage from './pages/owner/OwnerAiPage';
import OwnerSettingsPage from './pages/owner/OwnerSettingsPage';

const initialPayPalOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
  currency: 'USD',
  intent: 'capture',
  components: 'buttons',
};

export default function App() {
  return (
    <PayPalScriptProvider options={initialPayPalOptions}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Entry Gateway */}
              <Route path="/" element={<WelcomeGatewayPage />} />

              {/* Customer Portal (Nested Routes with Breadcrumbs) */}
              <Route path="/customer" element={<CustomerLayout />}>
                <Route index element={<Navigate to="/customer/home" replace />} />
                <Route path="home" element={<CustomerHomePage />} />
                <Route path="shop" element={<CustomerShopPage />} />
                <Route path="checkout" element={<CustomerCheckoutPage />} />
                <Route path="orders" element={<CustomerOrdersPage />} />
                <Route path="payments" element={<CustomerPaymentsPage />} />
                <Route path="invoices" element={<CustomerInvoicesPage />} />
                <Route path="spending" element={<CustomerSpendingPage />} />
                <Route path="ai" element={<CustomerAiPage />} />
                <Route path="settings" element={<CustomerSettingsPage />} />
              </Route>

              {/* Owner Portal (Nested Routes with Breadcrumbs) */}
              <Route path="/owner" element={<OwnerLayout />}>
                <Route index element={<Navigate to="/owner/overview" replace />} />
                <Route path="overview" element={<OwnerOverviewPage />} />
                <Route path="products" element={<OwnerProductsPage />} />
                <Route path="orders" element={<OwnerOrdersPage />} />
                <Route path="transactions" element={<OwnerTransactionsPage />} />
                <Route path="customers" element={<OwnerCustomersPage />} />
                <Route path="invoices" element={<OwnerInvoicesPage />} />
                <Route path="cash-flow" element={<OwnerCashFlowPage />} />
                <Route path="analytics" element={<OwnerAnalyticsPage />} />
                <Route path="ai" element={<OwnerAiPage />} />
                <Route path="settings" element={<OwnerSettingsPage />} />
              </Route>

              {/* Legacy Backward Compatibility Redirects */}
              <Route path="/merchant" element={<Navigate to="/owner/overview" replace />} />
              <Route path="/client" element={<Navigate to="/customer/home" replace />} />
              <Route path="/client-portal" element={<Navigate to="/customer/home" replace />} />
              <Route path="/forecast" element={<Navigate to="/owner/cash-flow" replace />} />
              <Route path="/assistant" element={<Navigate to="/owner/ai" replace />} />
              <Route path="/invoices" element={<Navigate to="/owner/invoices" replace />} />
              <Route path="/expenses" element={<Navigate to="/owner/cash-flow" replace />} />
              <Route path="/payments" element={<Navigate to="/owner/transactions" replace />} />
              <Route path="/settings" element={<Navigate to="/owner/settings" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </PayPalScriptProvider>
  );
}

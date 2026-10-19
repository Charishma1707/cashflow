import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL?.trim()) {
    return import.meta.env.VITE_API_BASE_URL.trim();
  }
  // When running in the browser
  if (typeof window !== 'undefined') {
    // Local development with Vite proxy
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api';
    }
    // Any cloud deployment (Render, Netlify, custom domain, etc.)
    return 'https://cashflow-copilot-api.onrender.com/api';
  }
  return 'https://cashflow-copilot-api.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds for Render free tier spin-up
});

// Response interceptor to catch sleeping backend (HTML response from proxy/free tier)
api.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === 'string' &&
      (response.data.includes('<!doctype html>') ||
        response.data.includes('<!DOCTYPE html>') ||
        response.data.includes('<html'))
    ) {
      const err = new Error('Render free tier backend is waking up from sleep (~30-50s). Please wait...');
      err.isColdStart = true;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    if (
      error.response &&
      typeof error.response.data === 'string' &&
      (error.response.data.includes('<!doctype html>') ||
        error.response.data.includes('<!DOCTYPE html>') ||
        error.response.data.includes('<html'))
    ) {
      error.message = 'Render free tier backend is waking up from sleep (~30-50s). Please wait...';
      error.isColdStart = true;
    }
    return Promise.reject(error);
  }
);

export const formatMoney = (cents, currency = 'USD') => {
  if (cents === undefined || cents === null || isNaN(cents)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

// Dashboard API
export const getDashboardSummary = async () => {
  const res = await api.get('/dashboard');
  return res.data?.data;
};

// Invoices API
export const getInvoices = async (params = {}) => {
  const res = await api.get('/invoices', { params });
  return res.data?.invoices || [];
};

export const getInvoiceById = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data?.invoice;
};

export const createInvoice = async (invoiceData) => {
  const res = await api.post('/invoices', invoiceData);
  return res.data?.invoice;
};

export const updateInvoiceStatus = async (id, status) => {
  const res = await api.put(`/invoices/${id}/status`, { status });
  return res.data?.invoice;
};

// Expenses API
export const getExpenses = async (params = {}) => {
  const res = await api.get('/expenses', { params });
  return res.data?.expenses || [];
};

export const createExpense = async (expenseData) => {
  const res = await api.post('/expenses', expenseData);
  return res.data?.expense;
};

export const updateExpenseStatus = async (id, status) => {
  const res = await api.put(`/expenses/${id}/status`, { status });
  return res.data?.expense;
};

export const deleteExpense = async (id) => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};

// Payments API
export const getPayments = async () => {
  const res = await api.get('/payments');
  return res.data?.payments || [];
};

// Business Settings API
export const getBusinessSettings = async () => {
  const res = await api.get('/business');
  return res.data?.business || {};
};

export const updateBusinessSettings = async (settingsData) => {
  const res = await api.put('/business/settings', settingsData);
  return res.data?.business;
};

// PayPal Sandbox Integration API
export const getPayPalStatus = async () => {
  const res = await api.get('/paypal/status');
  return res.data || { configured: false };
};

export const createPayPalOrder = async (invoiceId) => {
  const res = await api.post('/paypal/create-order', { invoiceId });
  return res.data;
};

export const capturePayPalOrder = async (orderId, invoiceId) => {
  const res = await api.post('/paypal/capture-order', { orderId, invoiceId });
  return res.data;
};

// Subscriptions / Expense PayPal Orders (Canva, Figma, AWS, Adobe)
export const createExpensePayPalOrder = async (expenseId) => {
  const res = await api.post('/paypal/create-expense-order', { expenseId });
  return res.data;
};

export const captureExpensePayPalOrder = async (orderId, expenseId) => {
  const res = await api.post('/paypal/capture-expense-order', { orderId, expenseId });
  return res.data;
};

// Service Request PayPal Orders
export const createServicePayPalOrder = async (serviceRequestId) => {
  const res = await api.post('/paypal/create-service-order', { serviceRequestId });
  return res.data;
};

export const captureServicePayPalOrder = async (orderId, serviceRequestId) => {
  const res = await api.post('/paypal/capture-service-order', { orderId, serviceRequestId });
  return res.data;
};

// Client Service Requests API
export const getServiceRequests = async (email = '', status = '') => {
  const params = {};
  if (email) params.email = email;
  if (status) params.status = status;
  const res = await api.get('/service-requests', { params });
  return res.data || [];
};

export const createServiceRequest = async (requestData) => {
  const res = await api.post('/service-requests', requestData);
  return res.data;
};

export const updateServiceRequestStatus = async (id, status) => {
  const res = await api.patch(`/service-requests/${id}/status`, { status });
  return res.data;
};

export const convertServiceRequestToInvoice = async (id) => {
  const res = await api.post(`/service-requests/${id}/convert-to-invoice`);
  return res.data;
};

// Financial Forecast & Runway API (6-month and 12-month)
export const getFinancialForecast = async (horizon = 12, scenario = 'baseline') => {
  const res = await api.get('/forecast', {
    params: { horizon, scenario },
  });
  return res.data;
};

// PayPal Remote MCP Server & AI Assistant API
export const getMcpStatus = async () => {
  const res = await api.get('/mcp/status');
  return res.data;
};

export const getMcpTools = async () => {
  const res = await api.get('/mcp/tools');
  return res.data;
};

export const callMcpTool = async (tool, args = {}) => {
  const res = await api.post('/mcp/call-tool', { tool, arguments: args });
  return res.data;
};

export const chatWithMcp = async (message, history = [], context = {}) => {
  const res = await api.post('/mcp/chat', { message, history, context });
  return res.data;
};

// Products API
export const getProducts = async (params = {}) => {
  const res = await api.get('/products', { params });
  return res.data || [];
};

export const getProductById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

export const createProduct = async (productData) => {
  const res = await api.post('/products', productData);
  return res.data;
};

export const updateProduct = async (id, productData) => {
  const res = await api.put(`/products/${id}`, productData);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

// Orders API
export const getOrders = async (params = {}) => {
  const res = await api.get('/orders', { params });
  return res.data || [];
};

export const getOrderById = async (id) => {
  const res = await api.get(`/orders/${id}`);
  return res.data;
};

export const createOrder = async (orderData) => {
  const res = await api.post('/orders', orderData);
  return res.data;
};

export const completeOrderPayment = async (id, paymentData) => {
  const res = await api.post(`/orders/${id}/complete`, paymentData);
  return res.data;
};

export const updateOrderFulfillment = async (id, fulfillmentStatus) => {
  const res = await api.patch(`/orders/${id}/fulfillment`, { fulfillmentStatus });
  return res.data;
};

// Customer Monthly Spending & Ledger API
export const getCustomerSpending = async (customerEmail) => {
  const res = await api.get('/spending', { params: { customerEmail } });
  return res.data;
};

export const updateSpendingSettings = async (settingsData) => {
  const res = await api.put('/spending/settings', settingsData);
  return res.data;
};

export const topUpAllowance = async (topUpData) => {
  const res = await api.post('/spending/top-up', topUpData);
  return res.data;
};

// Marketplace Listings (Prompt 1)
export const getMarketplaceListings = async (params = {}) => {
  const res = await api.get('/listings', { params });
  return res.data;
};

// Customer Spending Policy & Forecast (Prompts 3 & 10)
export const getCustomerPolicy = async () => {
  const res = await api.get('/customer-policy/me');
  return res.data;
};

export const updateCustomerPolicy = async (policyData) => {
  const res = await api.put('/customer-policy/me', policyData);
  return res.data;
};

export const getCustomerForecast = async () => {
  const res = await api.get('/customer-policy/forecast');
  return res.data;
};

export const triggerRecurringTopUp = async (data = {}) => {
  const res = await api.post('/customer-policy/recurring-topup', data);
  return res.data;
};

export const updateRecurringSchedule = async (scheduleData) => {
  const res = await api.put('/customer-policy/recurring-schedule', scheduleData);
  return res.data;
};

export const getCustomerApprovals = async () => {
  const res = await api.get('/customer-policy/approvals');
  return res.data;
};

export const decideCustomerApproval = async (id, decision) => {
  const res = await api.post(`/customer-policy/approvals/${id}/decide`, { decision });
  return res.data;
};

// Seller Policy & Autonomous Capacity (Prompt 4)
export const getSellerPolicy = async () => {
  const res = await api.get('/seller-policy/me');
  return res.data;
};

export const updateSellerPolicy = async (policyData) => {
  const res = await api.put('/seller-policy/me', policyData);
  return res.data;
};

// Autonomous Agent Bus & Negotiations (Prompts 5-8)
export const createNegotiationSession = async (data) => {
  const res = await api.post('/negotiations', data);
  return res.data;
};

export const getNegotiationSession = async (sessionId) => {
  const res = await api.get(`/negotiations/${sessionId}`);
  return res.data;
};

export const sendNegotiationMessage = async (sessionId, messageData) => {
  const res = await api.post(`/negotiations/${sessionId}/messages`, messageData);
  return res.data;
};

// Milestone Escrow & Deliverable Verification (Prompt 9)
export const getOrderMilestones = async (orderId) => {
  const res = await api.get(`/orders/${orderId}/milestones`);
  return res.data;
};

export const submitMilestoneDeliverable = async (orderId, milestoneIndex, deliverableData) => {
  const res = await api.post(`/orders/${orderId}/milestones/${milestoneIndex}/submit`, deliverableData);
  return res.data;
};

// Dispute Mediation Agent (Prompt 11)
export const getOrderDispute = async (orderId) => {
  const res = await api.get(`/disputes/${orderId}`);
  return res.data;
};

export const mediateOrderDispute = async (orderId, disputeData) => {
  const res = await api.post(`/disputes/${orderId}/mediate`, disputeData);
  return res.data;
};

// Audit Trail & Cryptographic Chain Verification (Prompt 11)
export const getAuditLogs = async (params = {}) => {
  const res = await api.get('/audit-logs', { params });
  return res.data;
};

export const verifyAuditChain = async () => {
  const res = await api.get('/audit-logs/verify-chain');
  return res.data;
};

export default api;




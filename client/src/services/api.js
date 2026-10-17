import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  return res.data.data;
};

// Invoices API
export const getInvoices = async (params = {}) => {
  const res = await api.get('/invoices', { params });
  return res.data.invoices;
};

export const getInvoiceById = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data.invoice;
};

export const createInvoice = async (invoiceData) => {
  const res = await api.post('/invoices', invoiceData);
  return res.data.invoice;
};

export const updateInvoiceStatus = async (id, status) => {
  const res = await api.put(`/invoices/${id}/status`, { status });
  return res.data.invoice;
};

// Expenses API
export const getExpenses = async (params = {}) => {
  const res = await api.get('/expenses', { params });
  return res.data.expenses;
};

export const createExpense = async (expenseData) => {
  const res = await api.post('/expenses', expenseData);
  return res.data.expense;
};

export const updateExpenseStatus = async (id, status) => {
  const res = await api.put(`/expenses/${id}/status`, { status });
  return res.data.expense;
};

export const deleteExpense = async (id) => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};

// Payments API
export const getPayments = async () => {
  const res = await api.get('/payments');
  return res.data.payments;
};

// Business Settings API
export const getBusinessSettings = async () => {
  const res = await api.get('/business');
  return res.data.business;
};

export const updateBusinessSettings = async (settingsData) => {
  const res = await api.put('/business/settings', settingsData);
  return res.data.business;
};

// PayPal Sandbox Integration API
export const getPayPalStatus = async () => {
  const res = await api.get('/paypal/status');
  return res.data;
};

export const createPayPalOrder = async (invoiceId) => {
  const res = await api.post('/paypal/create-order', { invoiceId });
  return res.data;
};

export const capturePayPalOrder = async (orderId, invoiceId) => {
  const res = await api.post('/paypal/capture-order', { orderId, invoiceId });
  return res.data;
};

export default api;

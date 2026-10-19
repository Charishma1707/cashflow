import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  User,
  CreditCard,
  Receipt,
  Plus,
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  DollarSign,
  Palette,
  Code,
  Cpu,
} from 'lucide-react';
import {
  getInvoices,
  getServiceRequests,
  createServiceRequest,
  chatWithMcp,
  formatMoney,
} from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PRESET_CLIENTS = [
  { name: 'Oak & Bean Artisan Cafe', email: 'orders@oakbeancafe.com', company: 'Oak & Bean Cafe' },
  { name: 'GreenBite Healthy Kitchens', email: 'purchasing@greenbite.com', company: 'GreenBite Kitchens' },
  { name: 'Sarah Jenkins (Family Box)', email: 'sarah.j@gmail.com', company: 'Household Delivery' },
  { name: 'Sunset Gourmet Bistro', email: 'chef@sunsetbistro.com', company: 'Sunset Bistro' },
];

const SERVICE_CATALOG = [
  {
    id: 'veggie-crate',
    title: 'Weekly Farm-Fresh Organic Veggie & Fruit Crate',
    category: 'UI/UX Design (Figma)',
    priceCents: 4500,
    priceStr: '$45.00',
    icon: Palette,
    badge: 'Farm Fresh',
    desc: 'Heirloom tomatoes, organic avocados, fresh berries, local apples, and crisp leafy greens picked same day.',
  },
  {
    id: 'dairy-bakery',
    title: 'Artisanal Dairy, Sourdough & Pastured Eggs Bundle',
    category: 'Branding & Graphics (Canva)',
    priceCents: 3500,
    priceStr: '$35.00',
    icon: Layers,
    badge: 'Top Pick',
    desc: 'Free-range organic eggs, crusty wood-fired sourdough, grass-fed artisan butter, and aged farmhouse cheddar.',
  },
  {
    id: 'family-pantry',
    title: 'Weekly Family Organic Pantry & Staples Box',
    category: 'Full-Stack Web App',
    priceCents: 9500,
    priceStr: '$95.00',
    icon: Code,
    badge: 'Best Value',
    desc: 'Organic cold-pressed olive oil, raw honey, organic whole milk crates, rolled oats, and fresh fruits.',
  },
  {
    id: 'cafe-wholesale',
    title: 'Commercial Cafe Bulk Oat Milk & Bakery Box',
    category: 'AI Copilot & Automation',
    priceCents: 25000,
    priceStr: '$250.00',
    icon: Cpu,
    badge: 'Wholesale',
    desc: '24 crates of barista certified organic oat milk and daily morning croissant batch for cafes and restaurants.',
  },
];

export default function ClientPortalPage({ onSelectInvoiceForPayment }) {
  const [selectedClient, setSelectedClient] = useState(PRESET_CLIENTS[0]);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'request', 'orders', 'ai'
  
  const [invoices, setInvoices] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Request Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('UI/UX Design (Figma)');
  const [customDesc, setCustomDesc] = useState('');
  const [customBudget, setCustomBudget] = useState('2500');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Client AI Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${PRESET_CLIENTS[0].name}! I'm your **Client Billing & Services Copilot**. Ask me anything about your pending invoices, payment history, or service orders.`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const gridRef = useRef();

  const loadClientData = async () => {
    try {
      setLoading(true);
      const [allInvs, allReqs] = await Promise.all([
        getInvoices(),
        getServiceRequests(selectedClient.email),
      ]);

      // Filter invoices for this specific client email
      const clientInvs = (allInvs || []).filter(
        (i) => i.customer?.email?.toLowerCase() === selectedClient.email.toLowerCase()
      );

      setInvoices(clientInvs);
      setServiceOrders(allReqs || []);
    } catch (err) {
      console.error('Failed to load client data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
    // Reset AI greeting for the selected client
    setMessages([
      {
        role: 'assistant',
        text: `Hello ${selectedClient.name}! I'm your **Client Billing & Services Copilot**. Ask me anything about your pending invoices, payment history, or service orders.`,
      },
    ]);
  }, [selectedClient]);

  // Compute metrics for the client
  const totalBilledCents = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalPaidCents = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
  const totalOutstandingCents = pendingInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

  // AG Grid Column Definitions for Client Invoices
  const columnDefs = useMemo(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'Invoice #',
        width: 150,
        pinned: 'left',
        cellRenderer: (params) => (
          <span className="font-mono font-bold text-blue-600 flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span>{params.value}</span>
          </span>
        ),
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        width: 130,
        cellRenderer: (params) => {
          const isOverdue =
            params.data.status !== 'PAID' && new Date() > new Date(params.value);
          return (
            <span
              className={`text-xs font-semibold ${
                isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}
            >
              {new Date(params.value).toLocaleDateString()}
            </span>
          );
        },
      },
      {
        field: 'items',
        headerName: 'Service Details',
        width: 250,
        cellRenderer: (params) => {
          const items = params.value || [];
          return (
            <span className="text-xs text-slate-700 truncate block">
              {items.map((it) => it.description).join(', ') || 'Professional Services'}
            </span>
          );
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Total Bill',
        width: 130,
        cellRenderer: (params) => (
          <span className="font-semibold text-slate-900">{formatMoney(params.value)}</span>
        ),
      },
      {
        field: 'outstandingBalance',
        headerName: 'Amount Due',
        width: 140,
        cellRenderer: (params) => {
          const isDue = params.value > 0;
          return (
            <span
              className={`font-bold ${
                isDue ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatMoney(params.value)}
            </span>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: (params) => {
          const s = params.value;
          if (s === 'PAID') {
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                PAID
              </span>
            );
          }
          if (s === 'PARTIALLY_PAID') {
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                PARTIAL
              </span>
            );
          }
          if (s === 'OVERDUE') {
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                OVERDUE
              </span>
            );
          }
          return (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              PENDING
            </span>
          );
        },
      },
      {
        headerName: 'Action',
        width: 170,
        pinned: 'right',
        cellRenderer: (params) => {
          const isPayable =
            params.data.status !== 'PAID' &&
            params.data.status !== 'CANCELLED' &&
            params.data.outstandingBalance > 0;

          if (!isPayable) {
            return (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settled</span>
              </span>
            );
          }

          return (
            <button
              onClick={() => onSelectInvoiceForPayment && onSelectInvoiceForPayment(params.data)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay with PayPal</span>
            </button>
          );
        },
      },
    ],
    [onSelectInvoiceForPayment]
  );

  const handleOrderCatalogItem = async (catalogItem) => {
    try {
      setOrderSubmitting(true);
      const res = await createServiceRequest({
        serviceTitle: catalogItem.title,
        category: catalogItem.category,
        description: catalogItem.desc,
        customer: selectedClient,
        budgetInCents: catalogItem.priceCents,
        notes: `Selected from startup service catalog by ${selectedClient.name}`,
      });
      setOrderSuccess(res);
      loadClientData();
      setActiveTab('orders');
    } catch (err) {
      console.error('Failed to order service:', err);
      alert(err.response?.data?.error || err.message || 'Failed to submit service order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCustomOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      setOrderSubmitting(true);
      const res = await createServiceRequest({
        serviceTitle: customTitle,
        category: customCategory,
        description: customDesc,
        customer: selectedClient,
        budgetInCents: Math.round(parseFloat(customBudget) * 100),
        notes: 'Custom client request submitted online',
      });
      setOrderSuccess(res);
      setCustomTitle('');
      setCustomDesc('');
      loadClientData();
      setActiveTab('orders');
    } catch (err) {
      console.error('Failed to submit custom request:', err);
      alert(err.response?.data?.error || err.message || 'Failed to submit service request');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleSendAiMessage = async (textToSend) => {
    const q = textToSend || inputMessage;
    if (!q || !q.trim()) return;

    const newMsgs = [...messages, { role: 'user', text: q }];
    setMessages(newMsgs);
    setInputMessage('');
    setAiLoading(true);

    try {
      const res = await chatWithMcp(q, newMsgs, {
        role: 'client',
        clientEmail: selectedClient.email,
      });

      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          text: res.reply,
          toolCall: res.toolCall,
        },
      ]);
    } catch (err) {
      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          text: `⚠️ Error querying client copilot: ${err.message}`,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Client Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30 uppercase">
              Client Portal
            </span>
            <span className="text-xs text-indigo-200">Customer View</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Welcome, {selectedClient.name}
          </h1>
          <p className="text-xs text-indigo-200 mt-1">
            Manage your orders, pending invoices, and settle bills instantly using PayPal Sandbox.
          </p>
        </div>

        {/* Client Account Switcher */}
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/15 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-xs text-indigo-200 font-semibold px-2 flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Switch Client:</span>
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_CLIENTS.map((c) => (
              <button
                key={c.email}
                onClick={() => setSelectedClient(c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedClient.email === c.email
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-indigo-200 hover:bg-white/10'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lifetime Spent"
          value={formatMoney(totalPaidCents)}
          subtitle="Collected payments with Acme Studio"
          icon={DollarSign}
          variant="success"
        />

        <StatCard
          title="Outstanding Bills"
          value={formatMoney(totalOutstandingCents)}
          subtitle={`${pendingInvoices.length} unpaid invoice(s)`}
          icon={Receipt}
          variant={totalOutstandingCents > 0 ? 'danger' : 'success'}
        />

        <StatCard
          title="Active Service Orders"
          value={serviceOrders.length.toString()}
          subtitle="Figma, Canva, and AI services"
          icon={Layers}
          variant="default"
        />

        <StatCard
          title="Payment Pipeline"
          value="PayPal Sandbox"
          subtitle="Instant 1-click order checkout"
          icon={ShieldCheck}
          variant="warning"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <div className="flex space-x-4">
          {[
            { id: 'invoices', label: `My Invoices & Bills (${invoices.length})`, icon: Receipt },
            { id: 'request', label: 'Request New Service', icon: Plus },
            { id: 'orders', label: `Service Orders (${serviceOrders.length})`, icon: Layers },
            { id: 'ai', label: 'Client AI Copilot', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Invoices & Bills (AG Grid) */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Invoices & Pending Bills for {selectedClient.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pay your outstanding invoices instantly with PayPal Sandbox.
              </p>
            </div>
            {totalOutstandingCents > 0 && (
              <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{formatMoney(totalOutstandingCents)} Pending Payment</span>
              </div>
            )}
          </div>

          <div
            className="ag-theme-quartz w-full rounded-xl overflow-hidden border border-slate-200"
            style={{ height: '360px' }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={invoices}
              columnDefs={columnDefs}
              animateRows={true}
              pagination={true}
              paginationPageSize={10}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Request New Service */}
      {activeTab === 'request' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Order Startup Services</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select a fixed-scope service package or submit a custom scope. Eligible for immediate PayPal payment.
            </p>
          </div>

          {/* Catalog Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICE_CATALOG.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-150">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Fixed Price</span>
                      <div className="font-extrabold text-base text-slate-900">{item.priceStr}</div>
                    </div>
                    <button
                      onClick={() => handleOrderCatalogItem(item)}
                      disabled={orderSubmitting}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Request & Order</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Scope Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900">Custom Service Request</h4>
            <form onSubmit={handleCustomOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Title</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Mobile App Redesign or SEO Strategy"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="UI/UX Design (Figma)">UI/UX Design (Figma)</option>
                    <option value="Branding & Graphics (Canva)">Branding & Graphics (Canva)</option>
                    <option value="Full-Stack Web App">Full-Stack Web App</option>
                    <option value="Cloud Infrastructure (AWS)">Cloud Infrastructure (AWS)</option>
                    <option value="AI Copilot & Automation">AI Copilot & Automation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Description & Requirements</label>
                <textarea
                  required
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Describe your deliverables, deadlines, and preferred tools..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Budget ($ USD)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Custom Service Request</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Service Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">
            Service Orders for {selectedClient.name} ({serviceOrders.length})
          </h3>

          {serviceOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No service requests found. Order a service package to get started!
            </div>
          ) : (
            <div className="space-y-3">
              {serviceOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{ord.serviceTitle}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                        {ord.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{ord.description}</p>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Submitted on {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget</span>
                      <span className="font-bold text-sm text-slate-900">
                        {formatMoney(ord.budgetInCents)}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          ord.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'INVOICED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Client AI Copilot */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">
                  Client Financial Copilot ({selectedClient.name})
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  Instant metrics, invoice queries, and PayPal guidance
                </span>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="hidden sm:flex items-center space-x-1.5">
              <button
                onClick={() => handleSendAiMessage('What bills do I have pending?')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
              >
                Pending Bills?
              </button>
              <button
                onClick={() => handleSendAiMessage('How much have I spent so far?')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
              >
                Total Spent?
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs italic">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>AI Copilot querying your invoices and bills...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
              placeholder="Ask about pending bills, order status, or payment..."
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSendAiMessage()}
              disabled={aiLoading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

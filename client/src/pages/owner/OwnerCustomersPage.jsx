import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Users, Search, Download, Plus, FileText, Mail, Building2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { getInvoices, getOrders, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const BASE_CUSTOMERS = [
  { name: 'Sarah Jenkins', email: 'sarah.j@gmail.com', company: 'Jenkins Family Box' },
  { name: 'Oak & Bean Artisan Cafe', email: 'orders@oakbeancafe.com', company: 'Oak & Bean Cafe' },
  { name: 'GreenBite Healthy Kitchens', email: 'purchasing@greenbite.com', company: 'GreenBite Kitchens' },
  { name: 'Sunset Gourmet Bistro', email: 'chef@sunsetbistro.com', company: 'Sunset Bistro' },
];

export default function OwnerCustomersPage() {
  const { setIsInvoiceModalOpen } = useOutletContext() || {};
  const [customerRows, setCustomerRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');

  const gridRef = useRef();

  useEffect(() => {
    setLoading(true);
    Promise.all([getInvoices(), getOrders()])
      .then(([invoices, orders]) => {
        // Aggregate customer statistics
        const aggMap = new Map();

        BASE_CUSTOMERS.forEach((c) => {
          aggMap.set(c.email.toLowerCase(), {
            name: c.name,
            email: c.email,
            company: c.company,
            totalSpendCents: 0,
            orderCount: 0,
            outstandingCents: 0,
            lastActivity: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          });
        });

        // Add from orders
        (orders || []).forEach((ord) => {
          const email = ord.customer?.email?.toLowerCase();
          if (!email) return;
          if (!aggMap.has(email)) {
            aggMap.set(email, {
              name: ord.customer?.name || email,
              email: email,
              company: 'Retail Shopper',
              totalSpendCents: 0,
              orderCount: 0,
              outstandingCents: 0,
              lastActivity: ord.createdAt,
            });
          }
          const curr = aggMap.get(email);
          curr.orderCount += 1;
          if (ord.paymentStatus === 'COMPLETED') {
            curr.totalSpendCents += ord.totalCents;
          }
          if (new Date(ord.createdAt) > new Date(curr.lastActivity)) {
            curr.lastActivity = ord.createdAt;
          }
        });

        // Add from invoices
        (invoices || []).forEach((inv) => {
          const email = inv.customer?.email?.toLowerCase();
          if (!email) return;
          if (!aggMap.has(email)) {
            aggMap.set(email, {
              name: inv.customer?.name || email,
              email: email,
              company: 'Invoice Client',
              totalSpendCents: 0,
              orderCount: 0,
              outstandingCents: 0,
              lastActivity: inv.createdAt,
            });
          }
          const curr = aggMap.get(email);
          curr.totalSpendCents += inv.paidAmount || 0;
          curr.outstandingCents += inv.outstandingBalance || 0;
        });

        setCustomerRows(Array.from(aggMap.values()));
      })
      .catch((e) => console.warn(e.message))
      .finally(() => setLoading(false));
  }, []);

  const ActionCellRenderer = (params) => {
    return (
      <button
        onClick={() => setIsInvoiceModalOpen && setIsInvoiceModalOpen(true)}
        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Invoice</span>
      </button>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Customer Name',
        width: 180,
        pinned: 'left',
        cellClass: 'font-bold text-slate-900',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'email',
        headerName: 'Billing Email',
        width: 200,
        cellClass: 'font-mono text-slate-600 text-xs',
      },
      {
        field: 'company',
        headerName: 'Account / Segment',
        width: 170,
        cellRenderer: (params) => (
          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
            {params.value}
          </span>
        ),
      },
      {
        field: 'totalSpendCents',
        headerName: 'Lifetime Spend',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-emerald-600',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
        sort: 'desc',
      },
      {
        field: 'outstandingCents',
        headerName: 'Outstanding Receivables',
        width: 170,
        cellClass: 'text-right font-mono font-bold text-rose-600',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'orderCount',
        headerName: 'Orders Count',
        width: 120,
        cellClass: 'text-center font-bold text-slate-800',
      },
      {
        headerName: 'Action',
        width: 100,
        cellRenderer: ActionCellRenderer,
        sortable: false,
        filter: false,
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `Customer_Directory_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Customer Directory & Accounts</h1>
          <p className="text-xs text-slate-500">
            Unified view of wholesale cafe accounts, family grocery subscribers, and lifetime spend metrics.
          </p>
        </div>
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customers by name, company, email..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Customers CSV</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Aggregating customer accounts..." />
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '500px', width: '100%' }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={customerRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows={true}
          />
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { CreditCard, Download, Search, Sparkles } from 'lucide-react';
import { formatMoney } from '../services/api';

export default function AgGridInvoices({ invoices = [], onSelectInvoice, onOpenNudgeBot }) {
  const gridRef = useRef();
  const [quickFilterText, setQuickFilterText] = useState('');

  // Status Badge Cell Renderer
  const StatusCellRenderer = (params) => {
    const status = params.value;
    const badgeStyles = {
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
      PARTIALLY_PAID: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
      SENT: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
      OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
      CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 font-bold',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] border ${
          badgeStyles[status] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {status}
      </span>
    );
  };

  // Actions Cell Renderer
  const ActionCellRenderer = (params) => {
    const inv = params.data;
    const isPayable =
      inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';

    return (
      <div className="flex items-center space-x-1.5 h-full">
        {isPayable ? (
          <button
            onClick={() => onSelectInvoice && onSelectInvoice(inv)}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <CreditCard className="w-3 h-3" />
            <span>Pay with PayPal</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectInvoice && onSelectInvoice(inv)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'Invoice #',
        width: 140,
        pinned: 'left',
        cellClass: 'font-mono font-bold text-slate-900',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'customer.name',
        headerName: 'Customer',
        flex: 1,
        minWidth: 160,
        cellRenderer: (params) => (
          <div>
            <div className="font-bold text-slate-800">{params.value}</div>
            <div className="text-[10px] text-slate-400 font-medium">{params.data?.customer?.email}</div>
          </div>
        ),
      },
      {
        field: 'issueDate',
        headerName: 'Issued',
        width: 120,
        valueFormatter: (params) =>
          new Date(params.value || params.data.createdAt).toLocaleDateString(),
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        width: 130,
        cellRenderer: (params) => {
          const isOverdue =
            new Date() > new Date(params.value) && params.data?.status !== 'PAID';
          return (
            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'}>
              {new Date(params.value).toLocaleDateString()}
            </span>
          );
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Total Amount',
        width: 140,
        cellClass: 'text-right font-mono font-semibold text-slate-800',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'outstandingBalance',
        headerName: 'Balance Due',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-blue-600',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: StatusCellRenderer,
        filter: 'agSetColumnFilter',
      },
      {
        headerName: 'Action',
        width: 160,
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
      fileName: `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-4">
      {/* AG Grid Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Quick search across all grid columns..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2">
          {onOpenNudgeBot && (
            <button
              onClick={onOpenNudgeBot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Nudge-Bot</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div
        className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
        style={{ height: '480px', width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={invoices}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          rowSelection="single"
          onRowClicked={(e) => {
            // If click wasn't on button, trigger invoice select
            if (e.event?.target?.tagName !== 'BUTTON') {
              onSelectInvoice && onSelectInvoice(e.data);
            }
          }}
          animateRows={true}
        />
      </div>
    </div>
  );
}


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
      PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      PARTIALLY_PAID: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      SENT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      DRAFT: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
      CANCELLED: 'bg-slate-800 text-slate-400 border-slate-700',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
          badgeStyles[status] || 'bg-slate-800 text-slate-400'
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
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all cursor-pointer"
          >
            <CreditCard className="w-3 h-3" />
            <span>Pay with PayPal</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectInvoice && onSelectInvoice(inv)}
            className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
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
        cellClass: 'font-mono font-bold text-white',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'customer.name',
        headerName: 'Customer',
        flex: 1,
        minWidth: 160,
        cellRenderer: (params) => (
          <div>
            <div className="font-medium text-slate-200">{params.value}</div>
            <div className="text-[10px] text-slate-400">{params.data?.customer?.email}</div>
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
            <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
              {new Date(params.value).toLocaleDateString()}
            </span>
          );
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Total Amount',
        width: 140,
        cellClass: 'text-right font-mono font-semibold text-white',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'outstandingBalance',
        headerName: 'Balance Due',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-cyan-400',
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Quick search across all grid columns..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {onOpenNudgeBot && (
            <button
              onClick={onOpenNudgeBot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-600/40 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Nudge-Bot</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div
        className="ag-theme-quartz-dark rounded-2xl overflow-hidden border border-slate-800 shadow-xl"
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

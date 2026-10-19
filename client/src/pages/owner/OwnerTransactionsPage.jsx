import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Receipt, Search, Download, CheckCircle2, Eye, X } from 'lucide-react';
import { getPayments, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerTransactionsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const gridRef = useRef();

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      setPayments(data || []);
    } catch (err) {
      console.warn('Failed to load transactions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const StatusCellRenderer = (params) => {
    const status = params.value;
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
        {status}
      </span>
    );
  };

  const ActionCellRenderer = (params) => {
    return (
      <button
        onClick={() => setSelectedTx(params.data)}
        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Inspect</span>
      </button>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'paypalCaptureId',
        headerName: 'PayPal Capture Ref',
        width: 170,
        pinned: 'left',
        cellClass: 'font-mono font-bold text-slate-800',
        valueGetter: (params) => params.data?.paypalCaptureId || params.data?.paypalOrderId || params.data?._id,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'createdAt',
        headerName: 'Date',
        width: 120,
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
        sort: 'desc',
      },
      {
        field: 'payer.name',
        headerName: 'Payer / Customer',
        width: 180,
        cellRenderer: (params) => (
          <div>
            <div className="font-bold text-slate-900 text-xs">{params.value || 'Verified Customer'}</div>
            <div className="text-[10px] text-slate-400 font-medium truncate">{params.data?.payer?.email}</div>
          </div>
        ),
      },
      {
        headerName: 'Channel',
        width: 160,
        valueGetter: (params) => (params.data?.orderId ? 'Online Grocery Store' : 'Wholesale Invoice'),
      },
      {
        field: 'amount',
        headerName: 'Amount Collected',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-emerald-600',
        valueFormatter: (params) => formatMoney(params.value, params.data?.currency),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: StatusCellRenderer,
      },
      {
        headerName: 'Action',
        width: 90,
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
      fileName: `Transactions_Ledger_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Financial Transactions & Captures</h1>
          <p className="text-xs text-slate-500">
            Real-time settled funds, invoice payments, and checkout transactions via PayPal Sandbox.
          </p>
        </div>
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transactions by capture ID, payer, amount..."
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
          <span>Export Transactions CSV</span>
        </button>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading transaction ledger..." />
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '500px', width: '100%' }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={payments}
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

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Transaction Record</span>
              <button onClick={() => setSelectedTx(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-mono font-bold text-slate-900">
                {formatMoney(selectedTx.amount, selectedTx.currency)}
              </h3>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                {selectedTx.status} via PayPal
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Capture ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedTx.paypalCaptureId || selectedTx._id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payer</span>
                <span className="font-medium text-slate-800">{selectedTx.payer?.name || 'Customer Account'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{selectedTx.payer?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp</span>
                <span className="font-medium text-slate-800">{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

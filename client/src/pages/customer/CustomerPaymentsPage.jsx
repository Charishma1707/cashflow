import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { CreditCard, Search, Download, CheckCircle2, Eye, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPayments, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CustomerPaymentsPage() {
  const { currentCustomer } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const gridRef = useRef();

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      // Filter payments where payer email matches currentCustomer.email or general customer captures
      const myPayments = (data || []).filter(
        (p) => !p.payer?.email || p.payer.email.toLowerCase() === currentCustomer?.email?.toLowerCase()
      );
      setPayments(myPayments);
    } catch (err) {
      console.warn('Failed to load payments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [currentCustomer]);

  const StatusCellRenderer = (params) => {
    const status = params.value;
    const isCompleted = status === 'COMPLETED';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
          isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {status}
      </span>
    );
  };

  const ActionCellRenderer = (params) => {
    return (
      <button
        onClick={() => setSelectedPayment(params.data)}
        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Details</span>
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
        headerName: 'Settled Date',
        width: 130,
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
        sort: 'desc',
      },
      {
        headerName: 'Payment Type',
        width: 160,
        valueGetter: (params) => (params.data?.orderId ? 'E-Commerce Checkout' : 'Invoice Payment'),
      },
      {
        field: 'amount',
        headerName: 'Amount Settled',
        width: 140,
        cellClass: 'text-right font-mono font-bold text-emerald-600',
        valueFormatter: (params) => formatMoney(params.value, params.data?.currency),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'paymentMethod',
        headerName: 'Method',
        width: 120,
        valueGetter: (params) => params.data?.paymentMethod || 'PAYPAL',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: StatusCellRenderer,
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
      fileName: `My_Payments_${currentCustomer.email}_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">My Payments</h1>
        <p className="text-xs text-slate-500">
          Complete ledger of verified PayPal captures, invoices paid, and checkout transactions.
        </p>
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payments by capture ID, status..."
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
          <span>Export CSV</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Retrieving payment records..." />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No payment records found</h3>
          <p className="text-xs text-slate-500">Completed PayPal transactions will appear here instantly.</p>
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '480px', width: '100%' }}
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
            rowSelection="single"
            onRowClicked={(e) => {
              if (e.event?.target?.tagName !== 'BUTTON') {
                setSelectedPayment(e.data);
              }
            }}
            animateRows={true}
          />
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Receipt</span>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-mono font-bold text-slate-900">
                {formatMoney(selectedPayment.amount, selectedPayment.currency)}
              </h3>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                {selectedPayment.status} via PayPal
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Capture ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedPayment.paypalCaptureId || selectedPayment._id}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date Settled</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedPayment.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payer Account</span>
                <span className="font-medium text-slate-800">
                  {selectedPayment.payer?.name || currentCustomer.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { ShoppingCart, Search, Download, Eye, X, CheckCircle2, Clock } from 'lucide-react';
import { getOrders, updateOrderFulfillment, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const gridRef = useRef();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(data || []);
    } catch (err) {
      console.warn('Failed to load owner orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleFulfillmentChange = async (orderId, newStatus) => {
    try {
      await updateOrderFulfillment(orderId, newStatus);
      loadOrders();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, fulfillmentStatus: newStatus }));
      }
    } catch (err) {
      alert('Failed to update fulfillment: ' + (err.response?.data?.error || err.message));
    }
  };

  // Payment Status Pill
  const PaymentStatusRenderer = (params) => {
    const status = params.value;
    const styles = {
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  // Fulfillment Cell Renderer with Quick Dropdown
  const FulfillmentRenderer = (params) => {
    const status = params.value;
    return (
      <select
        value={status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleFulfillmentChange(params.data._id, e.target.value)}
        className="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none"
      >
        <option value="UNFULFILLED">UNFULFILLED</option>
        <option value="PROCESSING">PROCESSING</option>
        <option value="SHIPPED">SHIPPED</option>
        <option value="DELIVERED">DELIVERED</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
    );
  };

  const ActionCellRenderer = (params) => {
    return (
      <button
        onClick={() => setSelectedOrder(params.data)}
        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>View</span>
      </button>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'orderNumber',
        headerName: 'Order #',
        width: 140,
        pinned: 'left',
        cellClass: 'font-mono font-bold text-slate-900',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'customer.name',
        headerName: 'Customer',
        width: 170,
        cellRenderer: (params) => (
          <div>
            <div className="font-bold text-slate-900 text-xs">{params.value}</div>
            <div className="text-[10px] text-slate-400 font-medium truncate">{params.data?.customer?.email}</div>
          </div>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Date',
        width: 110,
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
        sort: 'desc',
      },
      {
        headerName: 'Items Summary',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => {
          const items = params.data?.items || [];
          return items.map((i) => `${i.quantity}x ${i.title}`).join(', ');
        },
      },
      {
        field: 'totalCents',
        headerName: 'Total Price',
        width: 120,
        cellClass: 'text-right font-mono font-bold text-slate-900',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment',
        width: 120,
        cellRenderer: PaymentStatusRenderer,
      },
      {
        field: 'fulfillmentStatus',
        headerName: 'Fulfillment',
        width: 140,
        cellRenderer: FulfillmentRenderer,
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
      fileName: `Store_Orders_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Orders Master Workspace</h1>
          <p className="text-xs text-slate-500">
            Review customer orders, update delivery dispatch statuses, and monitor checkout volumes.
          </p>
        </div>
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search orders by number, customer, status..."
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
          <span>Export Orders CSV</span>
        </button>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading customer orders..." />
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '500px', width: '100%' }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={orders}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            onRowClicked={(e) => {
              if (e.event?.target?.tagName !== 'SELECT' && e.event?.target?.tagName !== 'BUTTON') {
                setSelectedOrder(e.data);
              }
            }}
            animateRows={true}
          />
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Order Record</span>
                <h3 className="text-base font-mono font-bold text-slate-900">{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-bold text-slate-800">{selectedOrder.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-700">{selectedOrder.customer?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address</span>
                <span className="font-medium text-slate-700">{selectedOrder.customer?.address || 'Standard Delivery'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PayPal Capture Ref</span>
                <span className="font-mono text-slate-800">{selectedOrder.paypalCaptureId || 'VERIFIED-SANDBOX'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Purchased Items</h4>
              <div className="divide-y divide-slate-100">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between">
                    <span>{item.quantity}x {item.title}</span>
                    <span className="font-mono font-bold">{formatMoney(item.totalCents)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Revenue</span>
              <span className="font-mono text-blue-600">{formatMoney(selectedOrder.totalCents)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

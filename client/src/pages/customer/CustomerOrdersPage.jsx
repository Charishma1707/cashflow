import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Package, Search, Download, Eye, X, CheckCircle2, Clock, FileCheck, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOrders, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import MilestoneEscrowModal from '../../components/MilestoneEscrowModal';
import DisputeMediationModal from '../../components/DisputeMediationModal';

export default function CustomerOrdersPage() {
  const { currentCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  const gridRef = useRef();

  const loadOrders = async () => {
    if (!currentCustomer?.email) return;
    setLoading(true);
    try {
      const data = await getOrders({ customerEmail: currentCustomer.email });
      setOrders(data || []);
    } catch (err) {
      console.warn('Failed to load customer orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentCustomer]);

  // Payment Status Pill
  const PaymentStatusRenderer = (params) => {
    const status = params.value;
    const styles = {
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
      REFUNDED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  // Fulfillment Status Pill
  const FulfillmentStatusRenderer = (params) => {
    const status = params.value;
    const styles = {
      DELIVERED: 'bg-blue-50 text-blue-700 border-blue-200',
      SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
      UNFULFILLED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  // Action Cell Renderer
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
        width: 150,
        pinned: 'left',
        cellClass: 'font-mono font-bold text-slate-900',
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
        headerName: 'Summary of Items',
        flex: 1,
        minWidth: 200,
        valueGetter: (params) => {
          const items = params.data?.items || [];
          return items.map((i) => `${i.quantity}x ${i.title}`).join(', ');
        },
      },
      {
        field: 'totalCents',
        headerName: 'Total Amount',
        width: 130,
        cellClass: 'text-right font-mono font-bold text-slate-900',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment',
        width: 130,
        cellRenderer: PaymentStatusRenderer,
      },
      {
        field: 'fulfillmentStatus',
        headerName: 'Fulfillment',
        width: 130,
        cellRenderer: FulfillmentStatusRenderer,
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
      fileName: `My_Orders_${currentCustomer.email}_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">My Orders</h1>
          <p className="text-xs text-slate-500">
            View full historical order receipts, delivery statuses, and PayPal payment records.
          </p>
        </div>
      </div>

      {/* AG Grid Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Quick search across orders..."
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

      {/* AG Grid Container */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading your orders..." />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-slate-500">When you place an order in our shop, it will appear here.</p>
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '480px', width: '100%' }}
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
            rowSelection="single"
            onRowClicked={(e) => {
              if (e.event?.target?.tagName !== 'BUTTON') {
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
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Details</span>
                <h2 className="text-lg font-mono font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Placed On</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Payment Status</span>
                  <span className="font-bold text-emerald-600">{selectedOrder.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Fulfillment</span>
                  <span className="font-semibold text-blue-600">{selectedOrder.fulfillmentStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">PayPal Capture ID</span>
                  <span className="font-mono text-slate-700">{selectedOrder.paypalCaptureId || 'VERIFIED-SANDBOX'}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Line Items</h4>
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {item.quantity} × {formatMoney(item.unitPriceCents)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(item.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatMoney(selectedOrder.subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-mono">{formatMoney(selectedOrder.shippingCents)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                  <span>Total Amount</span>
                  <span className="font-mono text-blue-600">{formatMoney(selectedOrder.totalCents)}</span>
                </div>
              </div>

              {/* Action Buttons for Milestones and Dispute */}
              <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                {selectedOrder.milestones?.length > 0 && (
                  <button
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center space-x-1 border border-teal-200 transition"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Inspect Milestones ({selectedOrder.milestones.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center space-x-1 border border-purple-200 transition"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>AI Dispute Mediation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedOrder && (
        <>
          <MilestoneEscrowModal
            isOpen={isMilestoneModalOpen}
            onClose={() => setIsMilestoneModalOpen(false)}
            order={selectedOrder}
            onUpdated={() => loadOrders()}
          />
          <DisputeMediationModal
            isOpen={isDisputeModalOpen}
            onClose={() => setIsDisputeModalOpen(false)}
            order={selectedOrder}
            onMediated={() => loadOrders()}
          />
        </>
      )}
    </div>
  );
}

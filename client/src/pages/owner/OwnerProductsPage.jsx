import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Package, Plus, Search, Download, Edit, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Dairy & Plant Milk');
  const [price, setPrice] = useState('24.00');
  const [stock, setStock] = useState('50');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [formError, setFormError] = useState('');

  const gridRef = useRef();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.warn('Failed to load products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setSku(`ORG-${Math.floor(100 + Math.random() * 900)}`);
    setTitle('');
    setCategory('Organic Produce');
    setPrice('12.00');
    setStock('40');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80');
    setBadge('Farm Fresh');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setTitle(prod.title);
    setCategory(prod.category);
    setPrice((prod.priceCents / 100).toFixed(2));
    setStock(prod.stock.toString());
    setDescription(prod.description || '');
    setImageUrl(prod.imageUrl || '');
    setBadge(prod.badge || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        sku,
        title,
        category,
        priceCents: Math.round(parseFloat(price) * 100),
        stock: parseInt(stock, 10),
        description,
        imageUrl,
        badge,
      };

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
      } else {
        await createProduct(payload);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Thumbnail Renderer
  const ImageCellRenderer = (params) => {
    return (
      <div className="flex items-center h-full">
        <img
          src={params.value || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=80&q=80'}
          alt="thumbnail"
          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
        />
      </div>
    );
  };

  // Stock Badge Renderer
  const StockCellRenderer = (params) => {
    const qty = params.value;
    const isLow = qty < 10;
    const isOut = qty <= 0;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          isOut
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : isLow
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}
      >
        {isOut ? 'Out of Stock' : `${qty} Units`}
      </span>
    );
  };

  // Actions Renderer
  const ActionsRenderer = (params) => {
    return (
      <div className="flex items-center space-x-1.5 h-full">
        <button
          onClick={() => openEditModal(params.data)}
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          title="Edit Product"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleDelete(params.data._id)}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          title="Delete Product"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const columnDefs = useMemo(
    () => [
      {
        field: 'imageUrl',
        headerName: '',
        width: 60,
        pinned: 'left',
        cellRenderer: ImageCellRenderer,
        sortable: false,
        filter: false,
      },
      {
        field: 'sku',
        headerName: 'SKU',
        width: 140,
        pinned: 'left',
        cellClass: 'font-mono font-bold text-slate-900',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'title',
        headerName: 'Product Name',
        flex: 1,
        minWidth: 200,
        cellClass: 'font-bold text-slate-900',
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 160,
      },
      {
        field: 'priceCents',
        headerName: 'Price',
        width: 120,
        cellClass: 'text-right font-mono font-bold text-slate-900',
        valueFormatter: (params) => formatMoney(params.value),
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'stock',
        headerName: 'Inventory Level',
        width: 140,
        cellRenderer: StockCellRenderer,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'badge',
        headerName: 'Badge',
        width: 120,
        cellRenderer: (params) =>
          params.value ? (
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {params.value}
            </span>
          ) : null,
      },
      {
        headerName: 'Actions',
        width: 90,
        cellRenderer: ActionsRenderer,
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
      fileName: `Products_Inventory_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Products & Inventory Management</h1>
          <p className="text-xs text-slate-500">
            Real-time catalog synchronized with online customer shopping cart and inventory reserves.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by SKU, title, category..."
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
          <span>Export Catalog CSV</span>
        </button>
      </div>

      {/* AG Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Loading catalog and inventory counts..." />
        </div>
      ) : (
        <div
          className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white"
          style={{ height: '500px', width: '100%' }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={products}
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

      {/* Product Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Product Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Organic Oat Milk 6-Pack"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700"
              />
            </div>

            <div className="text-xs">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Promotional Badge (Optional)
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Best Seller, Farm Fresh, Wholesale..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700"
              />
            </div>

            <div className="text-xs">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Description</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nutritional benefits, harvest source..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

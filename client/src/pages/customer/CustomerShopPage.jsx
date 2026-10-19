import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Plus, Check, Star, Filter, Sparkles, X, Bot } from 'lucide-react';
import { getProducts, formatMoney } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import NegotiationModal from '../../components/NegotiationModal';

const CATEGORIES = [
  'All',
  'Dairy & Plant Milk',
  'Dairy & Eggs',
  'Bakery',
  'Organic Produce',
  'Pantry & Oils',
  'Pantry & Sweeteners',
  'Beverages & Coffee',
];

export default function CustomerShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [negotiationTarget, setNegotiationTarget] = useState(null);
  const [addedItemMap, setAddedItemMap] = useState({});

  const { currentCustomer } = useAuth();
  const { addToCart } = useCart();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined,
        availableOnly: 'true',
      });
      setProducts(data || []);
    } catch (err) {
      console.warn('Failed to load products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleAddToCart = (product, e) => {
    e?.stopPropagation();
    addToCart(product, 1);
    setAddedItemMap((prev) => ({ ...prev, [product._id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product._id]: false }));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Catalog Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="max-w-2xl space-y-2 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/20">
            Fresh Organic Market
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Farm-Fresh Groceries & Artisanal Pantry</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Support local sustainable growers. All items are covered under your verified monthly spending allowance.
          </p>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search groceries (e.g. oat milk, honey, sourdough)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Search
          </button>
        </form>

        {/* Categories scroll */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Fetching freshly harvested catalog..." />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const isAdded = addedItemMap[product._id];
            return (
              <div
                key={product._id}
                onClick={() => setSelectedProduct(product)}
                className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        product.imageUrl ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'
                      }
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-900 shadow-xs backdrop-blur-xs">
                        {product.badge}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/70 text-white backdrop-blur-xs">
                      Stock: {product.stock}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description || 'Locally harvested organic item ready for fresh delivery.'}
                    </p>
                  </div>
                </div>

                {/* Price and Add button */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Price</span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {formatMoney(product.priceCents)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNegotiationTarget(product);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition border border-indigo-200"
                      title="Negotiate Price with AI Agent"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Negotiate</span>
                    </button>

                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock <= 0}
                    className={`flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : product.stock <= 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white text-slate-600 rounded-full shadow-md z-10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.title}
              className="w-full h-64 object-cover"
            />

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {selectedProduct.category} • SKU: {selectedProduct.sku}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">{selectedProduct.title}</h2>
                <p className="text-lg font-mono font-bold text-blue-600 mt-1">
                  {formatMoney(selectedProduct.priceCents)}
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Availability: <strong className="text-emerald-600">{selectedProduct.stock} units in stock</strong>
                </span>

                <button
                  onClick={(e) => {
                    handleAddToCart(selectedProduct, e);
                    setSelectedProduct(null);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Negotiation Modal */}
      <NegotiationModal
        isOpen={Boolean(negotiationTarget)}
        onClose={() => setNegotiationTarget(null)}
        listing={negotiationTarget}
        customerEmail={currentCustomer?.email}
      />
    </div>
  );
}

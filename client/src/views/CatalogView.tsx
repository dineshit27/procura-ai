import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Building,
  Star,
  Truck,
  Eye,
  PlusCircle,
  X,
  Layers,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { CatalogItem } from '../types';
import { fetchCatalogItems } from '../services/api';

interface CatalogViewProps {
  catalogItems?: CatalogItem[];
  onSelectForRequest: (item: CatalogItem) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  catalogItems,
  onSelectForRequest,
}) => {
  // Authoritative catalog state fetched from /api/catalog
  const [items, setItems] = useState<CatalogItem[]>(catalogItems || []);
  const [loading, setLoading] = useState<boolean>(!catalogItems || catalogItems.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchCatalogItems();
      setItems(fetched);
    } catch (err) {
      console.error('[CatalogView] Failed to load catalog from server:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to catalog API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!catalogItems || catalogItems.length === 0) {
      loadCatalog();
    } else {
      setItems(catalogItems);
      setLoading(false);
    }
  }, [catalogItems, loadCatalog]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'delivery'>('featured');

  // Selected Item Modal / Drawer
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);

  const categories = ['All', 'IT & Hardware', 'Office Ergonomics', 'Software & Cloud', 'Facility Supplies'];

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedCategory !== 'All' && item.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesSupplier = item.supplier.toLowerCase().includes(q);
          const matchesDesc = item.description.toLowerCase().includes(q);
          return matchesName || matchesSupplier || matchesDesc;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'delivery') return a.deliveryDays - b.deliveryDays;
        return 0; // featured default
      });
  }, [items, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white border-2 border-neutral-900 p-4 sm:p-5 shadow-brutal space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search demo catalog by title, supplier, or hardware specifications..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
              id="catalog-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex w-full sm:w-auto items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-neutral-600 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 border-2 border-neutral-900 bg-paper-100 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
              id="catalog-sort-select"
            >
              <option value="featured">Sort: Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="delivery">Fastest Delivery</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto overscroll-x-contain pt-2 pb-2 -mb-2 border-t border-neutral-200" aria-label="Catalog category filters">
          <Filter className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
          <span className="text-xs font-mono font-bold text-neutral-700 mr-1 uppercase">
            Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1 text-xs font-bold whitespace-nowrap border-2 transition ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-brutal-xs'
                  : 'bg-paper-100 text-neutral-700 border-neutral-400 hover:border-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Items Grid / State Views */}
      {loading && items.length === 0 ? (
        <div className="bg-white border-2 border-neutral-900 p-16 text-center shadow-brutal space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cobalt-700" />
          <h3 className="font-extrabold text-lg text-neutral-900">Loading Product Catalog</h3>
          <p className="text-xs font-mono text-neutral-500">
            Fetching authoritative vendor items from /api/catalog...
          </p>
        </div>
      ) : error && items.length === 0 ? (
        <div className="bg-white border-2 border-rose-500 p-12 text-center shadow-brutal space-y-4">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-extrabold text-lg text-neutral-900">Unable to Load Catalog</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadCatalog}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-bold border-2 border-neutral-900 shadow-brutal-xs hover:bg-neutral-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-neutral-900 p-12 text-center shadow-brutal space-y-3">
          <Layers className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="font-extrabold text-lg text-neutral-900">No matching products found</h3>
          <p className="text-xs text-neutral-600 max-w-sm mx-auto">
            Try adjusting your search query or reset the category filter to view all available demo vendor items.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 bg-paper-200 border-2 border-neutral-900 text-xs font-bold shadow-brutal-xs brutal-btn"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border-2 border-neutral-900 p-4 sm:p-5 shadow-brutal flex flex-col justify-between space-y-4 hover:shadow-brutal-lg transition-all"
            >
              <div className="space-y-3">
                {/* Header Tag & Stock Status */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cobalt-800 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
                    {item.category}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-900 bg-amber-200 px-2 py-0.5 border border-neutral-900">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-extrabold text-base text-neutral-900 leading-snug line-clamp-2">
                  {item.name}
                </h3>

                {/* Supplier info */}
                <div className="text-xs font-mono text-neutral-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span className="truncate">{item.supplier}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Metrics: Rating, Delivery */}
                <div className="pt-2 border-t border-neutral-200 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1 text-neutral-800 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{item.rating.toFixed(1)}</span>
                    <span className="text-neutral-500 text-[10px]">({item.reviewsCount})</span>
                  </div>
                  <div className="flex items-center space-x-1 text-neutral-800 font-semibold justify-end">
                    <Truck className="w-3.5 h-3.5 text-cobalt-700" />
                    <span>{item.deliveryDays}d delivery</span>
                  </div>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="pt-4 border-t-2 border-neutral-900 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Demo Unit Price</div>
                  <div className="text-xl font-extrabold font-mono text-neutral-900">
                    ${item.price.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveItem(item)}
                    className="p-2 border-2 border-neutral-900 bg-paper-100 hover:bg-paper-200 shadow-brutal-xs brutal-btn"
                    title="View item specs and details"
                  >
                    <Eye className="w-4 h-4 text-neutral-800" />
                  </button>
                  <button
                    onClick={() => onSelectForRequest(item)}
                    className="inline-flex items-center space-x-1 px-3 py-2 bg-cobalt-700 hover:bg-cobalt-800 text-white font-bold text-xs border-2 border-neutral-900 shadow-brutal-xs brutal-btn"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Select</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#FBF9F5] border-2 border-neutral-900 max-w-2xl w-full p-4 sm:p-8 shadow-brutal-lg max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto space-y-6" role="dialog" aria-modal="true" aria-label={`Catalog item details for ${activeItem.name}`}>
            <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-cobalt-700 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
                  {activeItem.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-2">
                  {activeItem.name}
                </h3>
                <div className="text-xs font-mono text-neutral-600 mt-1 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-cobalt-700" />
                  <span>{activeItem.supplier}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 border-2 border-neutral-900 bg-white hover:bg-paper-200 shadow-brutal-xs"
                aria-label="Close item details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-neutral-700 leading-relaxed">{activeItem.description}</p>

            {/* Specifications Matrix */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-900 mb-2.5">
                Technical Specifications & Terms:
              </h4>
              <div className="bg-white border-2 border-neutral-900 divide-y divide-neutral-200 text-xs">
                {Object.entries(activeItem.specs).map(([k, v]) => (
                  <div key={k} className="p-2.5 flex justify-between font-mono">
                    <span className="text-neutral-500 font-medium">{k}</span>
                    <span className="text-neutral-900 font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability & Compliance Note */}
            <div className="p-3.5 bg-paper-200 border-2 border-neutral-900 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-neutral-600">Stock Availability:</span>{' '}
                <strong className="text-emerald-700">
                  {activeItem.inStock ? `${activeItem.stockUnits} units (Ready to Ship)` : 'Backordered'}
                </strong>
              </div>
              <div>
                <span className="text-neutral-600">Delivery SLA:</span>{' '}
                <strong className="text-neutral-900">{activeItem.deliveryDays} Business Days</strong>
              </div>
            </div>

            {/* Footer Pricing & Trigger Action */}
            <div className="pt-4 border-t-2 border-neutral-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-neutral-500">Unit Price</div>
                <div className="text-2xl font-extrabold font-mono text-neutral-900">
                  ${activeItem.price.toFixed(2)} USD
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2.5 text-xs font-bold border-2 border-neutral-900 bg-white hover:bg-paper-100 shadow-brutal-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onSelectForRequest(activeItem);
                    setActiveItem(null);
                  }}
                  className="px-5 py-2.5 bg-cobalt-700 hover:bg-cobalt-800 text-white font-extrabold text-xs border-2 border-neutral-900 shadow-brutal-cobalt brutal-btn"
                >
                  Use in Purchase Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// app/customer/products/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/customer/ProductCard';
import { Search, SlidersHorizontal, X, AlertCircle, Package } from 'lucide-react';

interface Product {
  id: number;
  tensanpham: string;
  gia: number;
  hinhanh?: string;
  mota?: string;
  danhmuc_id?: number;
  tendanhmuc?: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const danhmucIdFromUrl = searchParams.get('danhmuc_id');

  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setProducts(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ==================== LỌC SẢN PHẨM ====================
  useEffect(() => {
    let result = [...products];

    // Lọc theo danh mục (ưu tiên danhmuc_id)
    if (danhmucIdFromUrl) {
      const id = parseInt(danhmucIdFromUrl);
      result = result.filter((p) => p.danhmuc_id === id);
    }

    // Lọc theo từ khóa
    if (search.trim()) {
      result = result.filter((p) =>
        p.tensanpham.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sắp xếp
    if (sort === 'price_asc') {
      result.sort((a, b) => a.gia - b.gia);
    } else if (sort === 'price_desc') {
      result.sort((a, b) => b.gia - a.gia);
    }

    setFiltered(result);
  }, [search, sort, products, danhmucIdFromUrl]);

  // Xóa bộ lọc danh mục
  const clearCategoryFilter = () => {
    window.history.pushState({}, '', '/customer/products');
    window.location.reload();
  };

  // Tên danh mục đang lọc
  const getCategoryName = () => {
    const id = parseInt(danhmucIdFromUrl || '0');
    const cat = [
      { id: 1, name: 'Điện thoại' },
      { id: 2, name: 'Máy tính bảng' },
      { id: 3, name: 'Laptop' },
      { id: 4, name: 'Phụ kiện điện thoại' },
      { id: 5, name: 'Phụ kiện laptop' },
    ].find(c => c.id === id);
    return cat?.name || '';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Tất cả sản phẩm</h1>
          <p className="text-gray-500 mt-2 text-lg">
            {loading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 focus:border-gray-400 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-1 bg-white">
            <SlidersHorizontal size={18} className="text-gray-500" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer py-2 pr-2"
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Badge đang lọc theo danh mục */}
      {danhmucIdFromUrl && (
        <div className="mb-6 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium">
            Đang lọc theo: <span className="font-semibold">{getCategoryName()}</span>
          </div>
          <button 
            onClick={clearCategoryFilter}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={16} /> Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-3xl mb-8 flex items-start gap-4">
          <AlertCircle size={22} className="mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            <button onClick={fetchProducts} className="mt-2 text-sm font-medium text-red-600 hover:underline">
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-3xl aspect-[4/3.2] animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight">Không tìm thấy sản phẩm</h3>
          <p className="text-gray-500 mt-2">Thử thay đổi từ khóa hoặc bộ lọc danh mục</p>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang tải sản phẩm...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
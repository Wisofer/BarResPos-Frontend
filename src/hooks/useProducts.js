import { useState, useCallback, useEffect } from "react";
import { productsApi } from "../api/products.js";
import { DEFAULT_PAGE_SIZE } from "../config/brand.js";

function normalizeListResponse(data) {
  if (data && typeof data === "object" && Array.isArray(data.items)) {
    return {
      list: data.items,
      totalCount: typeof data.totalCount === "number" ? data.totalCount : 0,
      totalPages: typeof data.totalPages === "number" ? data.totalPages : 0,
      page: typeof data.page === "number" ? data.page : 1,
      pageSize: typeof data.pageSize === "number" ? data.pageSize : DEFAULT_PAGE_SIZE,
    };
  }
  const list = Array.isArray(data) ? data : [];
  return {
    list,
    totalCount: list.length,
    totalPages: 1,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

export function useProducts(searchParam = "", pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { search: searchParam || undefined, page, pageSize };
      const data = await productsApi.list(params);
      const normalized = normalizeListResponse(data);
      setProducts(normalized.list);
      setTotalCount(normalized.totalCount);
      setTotalPages(normalized.totalPages);
    } catch (e) {
      setError(e.message);
      setProducts([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [searchParam, page, pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (searchParam !== undefined) setPage(1);
  }, [searchParam]);

  const create = useCallback(async (body) => {
    const created = await productsApi.create(body);
    setProducts((prev) => [...prev, created]);
    setTotalCount((c) => c + 1);
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await productsApi.update(id, body);
    setProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? updated : p)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await productsApi.delete(id);
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  const restock = useCallback(async (id, cantidad) => {
    const updated = await productsApi.restock(id, cantidad);
    setProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? updated : p)));
    return updated;
  }, []);

  return {
    products,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch: fetchProducts,
    create,
    update,
    remove,
    restock,
  };
}

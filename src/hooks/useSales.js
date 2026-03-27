import { useState, useCallback, useEffect, useRef } from "react";
import { salesApi } from "../api/sales.js";
import { getCachedList, setCachedList } from "../utils/listCache.js";
import { SALES_CACHE_PREFIX as CACHE_PREFIX } from "../config/brand.js";
import { DEFAULT_PAGE_SIZE } from "../config/brand.js";

export function useSales(filters = {}, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const filterKey = JSON.stringify(filters);
  const params = { ...filters, page, pageSize };
  const paramsKey = JSON.stringify(params);
  const [list, setList] = useState(() => getCachedList(CACHE_PREFIX, params) ?? []);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalsFromApi, setTotalsFromApi] = useState(null);
  const [loading, setLoading] = useState(() => !getCachedList(CACHE_PREFIX, params));
  const [error, setError] = useState(null);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
    const cached = getCachedList(CACHE_PREFIX, params);
    if (cached) {
      setList(Array.isArray(cached) ? cached : []);
      setTotalsFromApi(null);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    let cancelled = false;
    salesApi
      .list(params)
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data === "object" && Array.isArray(data.items)) {
          setList(data.items);
          setCachedList(CACHE_PREFIX, params, data.items);
          setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
          setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 0);
          setTotalsFromApi({
            totalAmountInCordobas: data.totalAmountInCordobas,
            totalPendingInCordobas: data.totalPendingInCordobas,
          });
        } else {
          const next = Array.isArray(data) ? data : [];
          setList(next);
          setCachedList(CACHE_PREFIX, params, next);
          setTotalCount(next.length);
          setTotalPages(1);
          setTotalsFromApi(null);
        }
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setList([]);
        setTotalCount(0);
        setTotalPages(0);
        setTotalsFromApi(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);

  const create = useCallback(async (body) => {
    const created = await salesApi.create(body);
    setList((prev) => {
      const next = [...prev, created];
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    setTotalCount((c) => c + 1);
    return created;
  }, [page, pageSize]);

  const update = useCallback(async (id, body) => {
    const updated = await salesApi.update(id, body);
    setList((prev) => {
      const next = prev.map((s) => (s.id === id || s.id === Number(id) ? updated : s));
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    return updated;
  }, [page, pageSize]);

  const remove = useCallback(async (id) => {
    await salesApi.delete(id);
    setList((prev) => {
      const next = prev.filter((s) => s.id !== id && s.id !== Number(id));
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    setTotalCount((c) => Math.max(0, c - 1));
  }, [page, pageSize]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.list({ ...filtersRef.current, page, pageSize });
      if (data && typeof data === "object" && Array.isArray(data.items)) {
        setList(data.items);
        setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, data.items);
        setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
        setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 0);
        setTotalsFromApi({
          totalAmountInCordobas: data.totalAmountInCordobas,
          totalPendingInCordobas: data.totalPendingInCordobas,
        });
      } else {
        const next = Array.isArray(data) ? data : [];
        setList(next);
        setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
        setTotalCount(next.length);
        setTotalPages(1);
        setTotalsFromApi(null);
      }
      setError(null);
    } catch (e) {
      setError(e.message);
      setList([]);
      setTotalCount(0);
      setTotalPages(0);
      setTotalsFromApi(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  return {
    sales: list,
    totalsFromApi,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch,
    create,
    update,
    remove,
  };
}

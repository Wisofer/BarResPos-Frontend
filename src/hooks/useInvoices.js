import { useState, useCallback, useEffect, useRef } from "react";
import { invoicesApi } from "../api/invoices.js";
import { getCachedList, setCachedList } from "../utils/listCache.js";
import { INVOICES_CACHE_PREFIX as CACHE_PREFIX } from "../config/brand.js";
import { DEFAULT_PAGE_SIZE } from "../config/brand.js";

function normalizeResponse(data) {
  if (data && typeof data === "object" && Array.isArray(data.items)) {
    return {
      list: data.items,
      totalCount: typeof data.totalCount === "number" ? data.totalCount : 0,
      totalPages: typeof data.totalPages === "number" ? data.totalPages : 0,
    };
  }
  const list = Array.isArray(data) ? data : [];
  return { list, totalCount: list.length, totalPages: 1 };
}

export function useInvoices(filters = {}, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const filterKey = JSON.stringify(filters);
  const params = { ...filters, page, pageSize };
  const paramsKey = JSON.stringify(params);
  const [list, setList] = useState(() => getCachedList(CACHE_PREFIX, params) ?? []);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(() => !getCachedList(CACHE_PREFIX, params));
  const [error, setError] = useState(null);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
    const cached = getCachedList(CACHE_PREFIX, params);
    if (cached) {
      setList(Array.isArray(cached) ? cached : []);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    let cancelled = false;
    invoicesApi
      .list(params)
      .then((data) => {
        if (cancelled) return;
        const { list: next, totalCount: tc, totalPages: tp } = normalizeResponse(data);
        setList(next);
        setTotalCount(tc);
        setTotalPages(tp);
        setCachedList(CACHE_PREFIX, params, next);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setList([]);
        setTotalCount(0);
        setTotalPages(0);
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

  const nextCode = useCallback(() => invoicesApi.nextCode(), []);

  const create = useCallback(async (body) => {
    const created = await invoicesApi.create(body);
    setList((prev) => {
      const next = [...prev, created];
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    setTotalCount((c) => c + 1);
    return created;
  }, [page, pageSize]);

  const update = useCallback(async (id, body) => {
    const updated = await invoicesApi.update(id, body);
    setList((prev) => {
      const next = prev.map((i) => (String(i.id) === String(id) ? updated : i));
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    return updated;
  }, [page, pageSize]);

  const remove = useCallback(async (id) => {
    await invoicesApi.delete(id);
    setList((prev) => {
      const next = prev.filter((i) => String(i.id) !== String(id));
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      return next;
    });
    setTotalCount((c) => Math.max(0, c - 1));
  }, [page, pageSize]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoicesApi.list({ ...filtersRef.current, page, pageSize });
      const { list: next, totalCount: tc, totalPages: tp } = normalizeResponse(data);
      setList(next);
      setTotalCount(tc);
      setTotalPages(tp);
      setCachedList(CACHE_PREFIX, { ...filtersRef.current, page, pageSize }, next);
      setError(null);
    } catch (e) {
      setError(e.message);
      setList([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  return {
    invoices: list,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch,
    nextCode,
    create,
    update,
    remove,
  };
}

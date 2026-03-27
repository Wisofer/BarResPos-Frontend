import { useState, useCallback, useEffect, useRef } from "react";
import { clientsApi } from "../api/clients.js";
import { getCachedClients, setCachedClients } from "../utils/clientsCache.js";
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

export function useClients(searchParam = "", pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchRef = useRef(searchParam);

  const fetchClients = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      }
      try {
        const params = {
          search: searchParam || undefined,
          page,
          pageSize,
        };
        const data = await clientsApi.list(params);
        const normalized = normalizeListResponse(data);
        setClients(normalized.list);
        setTotalCount(normalized.totalCount);
        setTotalPages(normalized.totalPages);
        if (page === 1) {
          setCachedClients(searchParam, {
            list: normalized.list,
            totalCount: normalized.totalCount,
            totalPages: normalized.totalPages,
          });
        }
        setError(null);
      } catch (e) {
        setError(e.message);
        setClients([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [searchParam, page, pageSize]
  );

  useEffect(() => {
    searchRef.current = searchParam;
    if (page === 1) {
      const cached = getCachedClients(searchParam);
      if (cached) {
        setClients(cached.list);
        setTotalCount(cached.totalCount);
        setTotalPages(cached.totalPages);
        setLoading(false);
        setError(null);
        return;
      }
    }
    setLoading(true);
    setError(null);

    let cancelled = false;
    clientsApi
      .list({
        search: searchParam || undefined,
        page,
        pageSize,
      })
      .then((data) => {
        if (cancelled) return;
        const normalized = normalizeListResponse(data);
        setClients(normalized.list);
        setTotalCount(normalized.totalCount);
        setTotalPages(normalized.totalPages);
        if (page === 1) {
          setCachedClients(searchParam, {
            list: normalized.list,
            totalCount: normalized.totalCount,
            totalPages: normalized.totalPages,
          });
        }
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setClients([]);
        setTotalCount(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParam, page, pageSize]);

  // Al cambiar búsqueda, volver a página 1
  const prevSearchRef = useRef(searchParam);
  useEffect(() => {
    if (prevSearchRef.current !== searchParam) {
      prevSearchRef.current = searchParam;
      setPage(1);
    }
  }, [searchParam]);

  const create = useCallback(
    async (body) => {
      const created = await clientsApi.create(body);
      setClients((prev) => {
        const next = [...prev, created];
        if (page === 1) setCachedClients(searchRef.current, { list: next, totalCount: totalCount + 1, totalPages });
        return next;
      });
      setTotalCount((c) => c + 1);
      return created;
    },
    [page, totalCount, totalPages]
  );

  const update = useCallback(
    async (id, body) => {
      const updated = await clientsApi.update(id, body);
      setClients((prev) => {
        const next = prev.map((c) => (c.id === id || c.id === Number(id) ? updated : c));
        if (page === 1) setCachedClients(searchRef.current, { list: next, totalCount, totalPages });
        return next;
      });
      return updated;
    },
    [page, totalCount, totalPages]
  );

  const remove = useCallback(
    async (id) => {
      await clientsApi.delete(id);
      setClients((prev) => {
        const next = prev.filter((c) => c.id !== id && c.id !== Number(id));
        if (page === 1) setCachedClients(searchRef.current, { list: next, totalCount: Math.max(0, totalCount - 1), totalPages });
        return next;
      });
      setTotalCount((c) => Math.max(0, c - 1));
    },
    [page, totalCount, totalPages]
  );

  return {
    clients,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch: () => fetchClients(false),
    create,
    update,
    remove,
  };
}

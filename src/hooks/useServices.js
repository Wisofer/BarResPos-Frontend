import { useState, useCallback, useEffect } from "react";
import { servicesApi } from "../api/services.js";
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

export function useServices(searchParam = "", pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [services, setServices] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { search: searchParam || undefined, page, pageSize };
      const data = await servicesApi.list(params);
      const normalized = normalizeListResponse(data);
      setServices(normalized.list);
      setTotalCount(normalized.totalCount);
      setTotalPages(normalized.totalPages);
    } catch (e) {
      setError(e.message);
      setServices([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [searchParam, page, pageSize]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    if (searchParam !== undefined) setPage(1);
  }, [searchParam]);

  const create = useCallback(async (body) => {
    const created = await servicesApi.create(body);
    setServices((prev) => [...prev, created]);
    setTotalCount((c) => c + 1);
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await servicesApi.update(id, body);
    setServices((prev) => prev.map((s) => (String(s.id) === String(id) ? updated : s)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await servicesApi.delete(id);
    setServices((prev) => prev.filter((s) => String(s.id) !== String(id)));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  return {
    services,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch: fetchServices,
    create,
    update,
    remove,
  };
}

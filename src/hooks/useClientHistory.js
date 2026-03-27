import { useState, useCallback } from "react";
import { clientsApi } from "../api/clients.js";
import { DEFAULT_HISTORY_PAGE_SIZE } from "../config/brand.js";

function normalizeSection(section) {
  if (section && typeof section === "object" && Array.isArray(section.items)) {
    return {
      items: section.items,
      totalCount: typeof section.totalCount === "number" ? section.totalCount : 0,
      totalPages: typeof section.totalPages === "number" ? section.totalPages : 0,
      page: typeof section.page === "number" ? section.page : 1,
      pageSize: typeof section.pageSize === "number" ? section.pageSize : DEFAULT_HISTORY_PAGE_SIZE,
    };
  }
  const items = Array.isArray(section) ? section : [];
  return {
    items,
    totalCount: items.length,
    totalPages: 1,
    page: 1,
    pageSize: DEFAULT_HISTORY_PAGE_SIZE,
  };
}

export function useClientHistory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_HISTORY_PAGE_SIZE;

  const fetchHistory = useCallback(async (clientId, pageNum = 1) => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.history(clientId, { page: pageNum, pageSize });
      const next = {
        ...res,
        client: res?.client ?? null,
        reservations: normalizeSection(res?.reservations),
        sales: normalizeSection(res?.sales),
        invoices: normalizeSection(res?.invoices),
        activity: Array.isArray(res?.activity) ? res.activity : [],
      };
      setData(next);
      setPage(pageNum);
      return next;
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setPage(1);
  }, []);

  const loadPage = useCallback(
    (newPage) => {
      if (!data?.client?.id) return;
      fetchHistory(data.client.id, newPage);
    },
    [data?.client?.id, fetchHistory]
  );

  const totalPages = data
    ? Math.max(
        data.reservations?.totalPages ?? 0,
        data.sales?.totalPages ?? 0,
        data.invoices?.totalPages ?? 0
      )
    : 0;

  return {
    data,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    fetchHistory,
    clear,
    loadPage,
  };
}

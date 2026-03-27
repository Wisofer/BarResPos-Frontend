import { useState, useCallback, useEffect } from "react";
import { expensesApi } from "../api/expenses.js";
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

export function useExpenses(filters = {}, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const { dateFrom, dateTo, category } = filters;
  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = { page, pageSize };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (category) params.category = category;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expensesApi.list(params);
      const { list, totalCount: tc, totalPages: tp } = normalizeResponse(data);
      setExpenses(list);
      setTotalCount(tc);
      setTotalPages(tp);
    } catch (e) {
      setError(e?.message || "Error al cargar egresos");
      setExpenses([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, category, page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const create = useCallback(async (body) => {
    const created = await expensesApi.create(body);
    setExpenses((prev) => [...prev, created]);
    setTotalCount((c) => c + 1);
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await expensesApi.update(id, body);
    setExpenses((prev) =>
      prev.map((e) => (e.id === id || e.id === Number(id) ? updated : e))
    );
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await expensesApi.delete(id);
    setExpenses((prev) =>
      prev.filter((e) => e.id !== id && e.id !== Number(id))
    );
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  return {
    expenses,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    refetch: fetchList,
    create,
    update,
    remove,
  };
}

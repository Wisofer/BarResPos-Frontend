import { useState, useCallback } from "react";
import { reportsApi } from "../api/reports.js";
import { DEFAULT_PAGE_SIZE } from "../config/brand.js";

export function useReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async (reportId, dateFrom, dateTo, page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    setLoading(true);
    setError(null);
    const params = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    };
    try {
      switch (reportId) {
        case "ingresos-totales":
          return await reportsApi.ingresosTotales(params);
        case "ventas-dia":
          return await reportsApi.ventasDia(params);
        case "ventas-mes":
          return await reportsApi.ventasMes(params);
        case "productos-mas-vendidos":
          return await reportsApi.productosMasVendidos();
        default:
          return null;
      }
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchReport, loading, error };
}

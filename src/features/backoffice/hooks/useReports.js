import { useCallback, useMemo, useState } from "react";
import { backofficeApi } from "../services/backofficeApi.js";
import { normalizeReporteTicketDetalle } from "../utils/reportUtils.js";
import { normalizeMovementRow } from "../utils/inventoryUtils.js";
import { addOneCalendarDay, buildDateRange, todayISO } from "../utils/reportDates.js";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  const p = payload || {};
  return p.items ?? p.Items ?? p.data ?? p.Data ?? p.rows ?? [];
}

/** Alinea con filtros de canal del informe; no aplica búsqueda por texto. */
function applyOrigenFilterVentaDetalle(rows, filtroVentas) {
  if (!Array.isArray(rows)) return [];
  const o = (r) => String(r?.origen ?? r?.Origen ?? "").toLowerCase();
  if (filtroVentas === "mesa")
    return rows.filter((r) => {
      const x = o(r);
      return x === "mesa" || x === "llevar";
    });
  if (filtroVentas === "delivery") return rows.filter((r) => o(r) === "delivery");
  return rows;
}

function filaTotalVenta(r) {
  return Number(r?.total ?? r?.Total ?? 0);
}

export function useReports(showSuccess, showError) {
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroVentas, setFiltroVentas] = useState("todas");
  const [topN, setTopN] = useState(10);
  const [dateFilters, setDateFilters] = useState({ desde: todayISO(), hasta: todayISO() });
  const [reportData, setReportData] = useState({
    ventasResumen: null,
    ventasDetalle: [],
    productosTop: [],
    ventasMeseros: [],
    ventasCategorias: [],
    cajaHistorial: [],
    movimientosProductos: [],
  });
  const [ventaDetailOpen, setVentaDetailOpen] = useState(false);
  const [ventaDetailLoading, setVentaDetailLoading] = useState(false);
  const [ventaDetailData, setVentaDetailData] = useState(null);
  const [categoriaProductosOpen, setCategoriaProductosOpen] = useState(false);
  const [categoriaProductosLoading, setCategoriaProductosLoading] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categoriaProductos, setCategoriaProductos] = useState([]);

  const params = useMemo(() => {
    const p = buildDateRange(dateFilters);
    if (activeReport === "ventas") {
      if (filtroVentas === "todas") p.filtroVentas = "todas";
      else if (filtroVentas === "anuladas") p.filtroVentas = "anuladas";
      else p.filtroVentas = "activas";
    }
    if (activeReport === "productos-top") p.top = topN;
    // Inventario usa `<= fechaFin`; para incluir todo el "hasta" elegido sumamos 1 día.
    if (activeReport === "movimientos" && p.hasta) {
      p.hasta = addOneCalendarDay(p.hasta);
    }
    return p;
  }, [activeReport, dateFilters, filtroVentas, topN]);

  const loadReportData = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      if (activeReport === "ventas") {
        const [resumen, detalle] = await Promise.all([
          backofficeApi.reportesResumenVentas(params),
          backofficeApi.reportesResumenVentasDetalle(params),
        ]);
        setReportData((prev) => ({
          ...prev,
          ventasResumen: resumen || null,
          ventasDetalle: normalizeRows(detalle),
        }));
      } else if (activeReport === "productos-top") {
        const data = await backofficeApi.reportesProductosTop(params);
        setReportData((prev) => ({ ...prev, productosTop: normalizeRows(data) }));
      } else if (activeReport === "meseros") {
        const data = await backofficeApi.reportesVentasPorMesero(params);
        setReportData((prev) => ({ ...prev, ventasMeseros: normalizeRows(data) }));
      } else if (activeReport === "categorias") {
        const data = await backofficeApi.reportesVentasPorCategoria(params);
        setReportData((prev) => ({ ...prev, ventasCategorias: normalizeRows(data) }));
      } else if (activeReport === "caja") {
        const data = await backofficeApi.cajaHistorial(params);
        setReportData((prev) => ({ ...prev, cajaHistorial: normalizeRows(data) }));
      } else if (activeReport === "movimientos") {
        const data = await backofficeApi.movimientosProductos(params);
        setReportData((prev) => ({ ...prev, movimientosProductos: normalizeRows(data).map(normalizeMovementRow) }));
      }
    } catch (e) {
      showError?.(e?.message || "No se pudo cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [activeReport, params, showError]);

  const exportReport = useCallback(async () => {
    if (!activeReport) return;
    if (activeReport === "caja") {
      try {
        await backofficeApi.exportarCajaHistorialExcel(params);
        showSuccess?.("Excel exportado correctamente");
      } catch (e) {
        showError?.(e?.message || "No se pudo exportar");
      }
      return;
    }
    if (activeReport === "movimientos") {
      try {
        const blob = await backofficeApi.exportMovimientosProductosExcel(params);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `movimientos-inventario-${todayISO()}.xlsx`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showSuccess?.("Excel exportado correctamente");
      } catch (e) {
        showError?.(e?.message || "No se pudo exportar");
      }
      return;
    }
    const query = new URLSearchParams({ ...params, exportar: "true" });
    const map = {
      ventas: "/api/v1/reportes/resumen-ventas",
      "productos-top": "/api/v1/reportes/productos-top",
      meseros: "/api/v1/reportes/ventas-por-mesero",
      categorias: "/api/v1/reportes/ventas-por-categoria",
    };
    const path = map[activeReport];
    if (!path) {
      showError?.("Este reporte no soporta exportación Excel");
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}${path}?${query.toString()}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error("No se pudo exportar el archivo");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${activeReport}-${todayISO()}.xlsx`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showSuccess?.("Excel exportado correctamente");
    } catch (e) {
      showError?.(e?.message || "No se pudo exportar");
    }
  }, [activeReport, params, showError, showSuccess]);

  const exportCategoriaDesglose = useCallback(async () => {
    if (activeReport !== "categorias") return;
    try {
      const blob = await backofficeApi.exportReportesCategoriaDesgloseExcel(params);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ventas-categoria-desglose-${todayISO()}.xlsx`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showSuccess?.("Desglose por categoría exportado correctamente");
    } catch (e) {
      showError?.(e?.message || "No se pudo exportar el desglose");
    }
  }, [activeReport, params, showError, showSuccess]);

  const resetFilters = useCallback(() => {
    setDateFilters({ desde: todayISO(), hasta: todayISO() });
    setSearch("");
    setFiltroVentas("todas");
    setTopN(10);
  }, []);

  const onOpenVentaDetail = useCallback(
    async (id) => {
      if (!id) return;
      setVentaDetailOpen(true);
      setVentaDetailLoading(true);
      try {
        const data = await backofficeApi.reportesVentaTicketDetalle(id);
        setVentaDetailData(normalizeReporteTicketDetalle(data));
      } catch (e) {
        showError?.(e?.message || "No se pudo cargar detalle");
      } finally {
        setVentaDetailLoading(false);
      }
    },
    [showError],
  );

  const onOpenCategoriaProductos = useCallback(
    async (categoria) => {
      setCategoriaSeleccionada(categoria || null);
      setCategoriaProductosOpen(true);
      setCategoriaProductosLoading(true);
      try {
        const data = await backofficeApi.reportesVentasPorCategoriaDesglose(params);
        const items = normalizeRows(data);
        const name = categoria?.categoria || categoria?.nombre || categoria?.Categoria || "";
        const found = items.find(
          (x) => String(x.categoria || x.Categoria || "").toLowerCase() === String(name).toLowerCase(),
        );
        const list = found?.productos || found?.Productos || [];
        setCategoriaProductos(Array.isArray(list) ? list : []);
      } catch (e) {
        showError?.(e?.message || "No se pudo cargar desglose");
      } finally {
        setCategoriaProductosLoading(false);
      }
    },
    [params, showError],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filterByTerm = (rows, keys) => {
      if (!term) return rows;
      return rows.filter((r) => keys.some((k) => String(r?.[k] ?? "").toLowerCase().includes(term)));
    };
    const ventasDetalle = applyOrigenFilterVentaDetalle(reportData.ventasDetalle, filtroVentas);
    return {
      ventasRows: filterByTerm(ventasDetalle, ["numero", "estado", "metodoPago", "origen", "Origen"]),
      productosTopRows: filterByTerm(reportData.productosTop, ["producto"]),
      meserosRows: filterByTerm(reportData.ventasMeseros, ["mesero", "vendedor", "usuario"]),
      categoriasRows: filterByTerm(reportData.ventasCategorias, ["categoria"]),
      movimientosRows: filterByTerm(reportData.movimientosProductos, ["productoNombre", "tipo", "subtipo"]),
    };
  }, [search, reportData, filtroVentas]);

  /** Totales coherentes con la tabla (mismo rango, mismo filtro de canal; sin filtro de búsqueda). */
  const ventasResumenVista = useMemo(() => {
    const base = reportData.ventasResumen || null;
    const detalle = reportData.ventasDetalle;
    if (!Array.isArray(detalle) || detalle.length === 0) return base;
    const slice = applyOrigenFilterVentaDetalle(detalle, filtroVentas);
    const totalVentas = Math.round(slice.reduce((s, r) => s + filaTotalVenta(r), 0) * 100) / 100;
    const totalOrdenes = slice.length;
    const promedioTicket = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
    return {
      ...base,
      totalVentas,
      totalOrdenes,
      promedioTicket,
    };
  }, [reportData.ventasResumen, reportData.ventasDetalle, filtroVentas]);

  return {
    activeReport,
    setActiveReport,
    loading,
    search,
    setSearch,
    filtroVentas,
    setFiltroVentas,
    topN,
    setTopN,
    dateFilters,
    setDateFilters,
    reportData,
    ventasResumenVista,
    loadReportData,
    exportReport,
    exportCategoriaDesglose,
    resetFilters,
    ...filteredRows,
    ventaDetailOpen,
    setVentaDetailOpen,
    ventaDetailLoading,
    ventaDetailData,
    onOpenVentaDetail,
    categoriaProductosOpen,
    setCategoriaProductosOpen,
    categoriaProductosLoading,
    categoriaSeleccionada,
    categoriaProductos,
    onOpenCategoriaProductos,
  };
}

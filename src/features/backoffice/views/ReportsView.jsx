import { useEffect, useState } from "react";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";
import { backofficeApi } from "../services/backofficeApi.js";
import { formatCurrency } from "../utils/currency.js";
import {
  cierreFechaRaw,
  cierreHistorialMontoPrincipal,
  cierreHistorialTotalVentas,
  cierreId,
} from "../utils/caja.js";
import { BarChart3, Boxes, CircleDollarSign, History, Tags, Users, X } from "lucide-react";

/** Etiqueta de categoría según lo que devuelve `/dashboard/resumen` (p. ej. nombreCategoria). */
function categoriaReporteNombre(row, index) {
  const r = row || {};
  return (
    r.nombreCategoria ??
    r.NombreCategoria ??
    r.categoriaNombre ??
    r.CategoriaNombre ??
    r.categoria ??
    r.nombre ??
    r.label ??
    (r.categoriaId != null || r.CategoriaProductoId != null
      ? `Categoría #${r.categoriaId ?? r.CategoriaProductoId}`
      : null) ??
    `Categoría ${index + 1}`
  );
}

const reportCards = [
  {
    id: "ventas",
    title: "Reporte de Ventas",
    description: "Ventas por periodo con métricas generales y desglose diario.",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
    button: "Ver reporte",
  },
  {
    id: "productos-top",
    title: "Productos Más Vendidos",
    description: "Top de productos por cantidad vendida y total de ventas.",
    icon: Boxes,
    color: "bg-green-100 text-green-600",
    button: "Ver reporte",
  },
  {
    id: "meseros",
    title: "Ventas por Mesero",
    description: "Sección lista para incorporar endpoint por desempeño de meseros.",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
    button: "Ver reporte",
  },
  {
    id: "categorias",
    title: "Ventas por Categoría",
    description: "Sección lista para incorporar endpoint por categoría de producto.",
    icon: Tags,
    color: "bg-orange-100 text-orange-600",
    button: "Ver reporte",
  },
  {
    id: "caja",
    title: "Cierre de Caja",
    description: "Sección lista para incorporar endpoint de cierre y arqueo de caja.",
    icon: CircleDollarSign,
    color: "bg-amber-100 text-amber-600",
    button: "Ver reporte",
  },
  {
    id: "movimientos",
    title: "Movimientos de Inventario",
    description: "Registro de entradas, salidas y ajustes de stock de productos.",
    icon: History,
    color: "bg-red-100 text-red-600",
    button: "Ver reporte",
  },
];

export function ReportsView({ currencySymbol = "C$" }) {
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState(null);
  const [range, setRange] = useState({ desde: "", hasta: "", top: 10 });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const reportRange = {
    desde: range?.desde?.trim() || undefined,
    hasta: range?.hasta?.trim() || undefined,
  };

  const downloadExcel = async (reportId) => {
    setExporting(true);
    setError("");
    try {
      const apiRange = reportRange;
      const query = new URLSearchParams();
      if (apiRange.desde) query.set("desde", apiRange.desde);
      if (apiRange.hasta) query.set("hasta", apiRange.hasta);
      
      let endpoint = "";
      let filename = "reporte.xlsx";

      switch (reportId) {
        case "ventas":
          endpoint = "/api/v1/reportes/resumen-ventas/excel";
          filename = `resumen-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case "productos-top":
          endpoint = "/api/v1/reportes/productos-top/excel";
          query.set("top", String(range.top || 10));
          filename = `productos-top-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case "meseros":
          endpoint = "/api/v1/reportes/ventas-por-mesero/excel";
          filename = `ventas-por-mesero-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case "categorias":
          endpoint = "/api/v1/reportes/ventas-por-categoria/excel";
          filename = `ventas-por-categoria-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case "caja":
          endpoint = "/api/v1/caja/historial/excel";
          filename = `historial-caja-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case "movimientos":
          endpoint = "/api/v1/productos/movimientos/excel";
          filename = `movimientos-inventario-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        default:
          throw new Error("Tipo de reporte no soportado para Excel.");
      }

      const url = `${getApiUrl()}${endpoint}${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error("No se pudo exportar el reporte.");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e.message || "Error al exportar Excel.");
    } finally {
      setExporting(false);
    }
  };

  const loadReportData = async (reportId = activeReport) => {
    if (!reportId) return;
    setLoading(true);
    setError("");
    try {
      const query = reportRange;
      if (reportId === "ventas") {
        const [data, pedidos] = await Promise.all([
          backofficeApi.reportesResumenVentas(query),
          backofficeApi.reportesResumenVentasDetalle(query),
        ]);
        const details = Array.isArray(data?.desglosePorDia) ? data.desglosePorDia : data?.dias || [];
        const ordersItems = Array.isArray(pedidos?.items) ? pedidos.items : Array.isArray(pedidos) ? pedidos : [];
        setRows(details);
        setOrders(
          ordersItems.map((o, i) => ({
            key: `${o.origen || o.origenPedido || "order"}-${o.id || i}-${i}`,
            sourceId: o.id || o.Id || null,
            numero: o.numero || o.codigo || `#${1200 + i}`,
            fecha: o.fecha || o.fechaCreacion || o.createdAt || "",
            origen: o.origen || o.origenPedido || "-",
            referencia:
              o.mesa ||
              o.mesaNumero ||
              o.cliente ||
              o.clienteNombre ||
              (String(o.origen || o.origenPedido || "").toLowerCase() === "delivery" ? "Delivery" : "-"),
            mesero: o.mesero || o.usuario || "-",
            monto: Number(o.monto ?? o.total ?? 0),
          }))
        );
        setSummary({
          totalVentas: data?.totalVentas ?? data?.total ?? 0,
          totalOrdenes: data?.totalOrdenes ?? data?.ordenes ?? 0,
          promedioTicket: data?.promedioTicket ?? data?.ticketPromedio ?? 0,
        });
      } else if (reportId === "productos-top") {
        const data = await backofficeApi.reportesProductosTop({ ...reportRange, top: range.top || 10 });
        setRows(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
        setSummary(null);
      } else if (reportId === "meseros") {
        const data = await backofficeApi.reportesVentasPorMesero(reportRange);
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const result = items
          .map((r) => ({
            meseroId: r.meseroId ?? r.MeseroId ?? null,
            mesero: r.mesero || r.usuario || "Sin mesero",
            ordenes: Number(r.ordenes ?? r.Ordenes ?? 0),
            venta: Number(r.totalVentas ?? r.total ?? r.venta ?? 0),
            promedioTicket: Number(r.promedioTicket ?? r.ticketPromedio ?? 0),
          }))
          .sort((a, b) => b.venta - a.venta);
        setRows(result);
        const totalVentas = Number(
          data?.totalVentas ??
            data?.total ??
            result.reduce((sum, r) => sum + Number(r.venta || 0), 0)
        );
        const totalOrdenes = Number(
          data?.totalOrdenes ??
            data?.ordenes ??
            result.reduce((sum, r) => sum + Number(r.ordenes || 0), 0)
        );
        setSummary({
          totalVentas,
          totalOrdenes,
          promedioTicket:
            Number(data?.promedioTicket ?? data?.ticketPromedio) ||
            (totalOrdenes > 0 ? totalVentas / totalOrdenes : 0),
        });
      } else if (reportId === "categorias") {
        const data = await backofficeApi.reportesVentasPorCategoria(reportRange);
        const categories = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setRows(categories);
        const totalVentas = categories.reduce((sum, c) => sum + Number(c.total || c.venta || 0), 0);
        setSummary({
          totalVentas,
          totalOrdenes: 0,
          promedioTicket: 0,
        });
      } else if (reportId === "caja") {
        const data = await backofficeApi.cajaHistorial({ page: 1, pageSize: 100 });
        const items = Array.isArray(data?.items) ? data.items : [];
        const filtered = items.filter((x) => {
          const rawDate = x.fechaCierre || x.fecha || x.createdAt;
          if (!rawDate) return true;
          const d = new Date(rawDate);
          if (Number.isNaN(d.getTime())) return true;
          if (range.desde) {
            const from = new Date(`${range.desde}T00:00:00`);
            if (d < from) return false;
          }
          if (range.hasta) {
            const to = new Date(`${range.hasta}T23:59:59`);
            if (d > to) return false;
          }
          return true;
        });
        setRows(filtered);
        const totalVentas = filtered.reduce((sum, c) => sum + Number(c.totalVentas ?? c.total ?? 0), 0);
        setSummary({
          totalVentas,
          totalOrdenes: filtered.length,
          promedioTicket: 0,
        });
      } else if (reportId === "movimientos") {
        const data = await backofficeApi.movimientosProductos(reportRange);
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setRows(items);
        setSummary(null);
      }
    } catch (e) {
      setRows([]);
      setSummary(null);
      setError(e.message || "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (order) => {
    const sourceId = Number(order?.sourceId);
    if (!Number.isFinite(sourceId)) {
      setError("No se encontró el identificador de la orden para ver detalle.");
      return;
    }
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const origin = String(order?.origen || "").toLowerCase();
      const detail =
        origin === "delivery"
          ? await backofficeApi.getDeliveryPedido(sourceId)
          : await backofficeApi.getPedido(sourceId);
      setDetailOrder(detail || null);
    } catch (e) {
      setError(e.message || "No se pudo cargar el detalle de la orden.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport) loadReportData(activeReport);
  }, [activeReport]);

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {!activeReport && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Catalogo de reportes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Consulta indicadores y exporta reportes clave del sistema.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reportCards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
              </div>
              <p className="min-h-[40px] text-sm text-slate-500">{card.description}</p>
              <button
                onClick={() => {
                  setActiveReport(card.id);
                }}
                className={`mt-3 inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                  card.id === "ventas"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : card.id === "productos-top"
                      ? "bg-green-600 hover:bg-green-700"
                      : card.id === "meseros"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : card.id === "categorias"
                          ? "bg-orange-600 hover:bg-orange-700"
                          : card.id === "movimientos"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {card.button}
              </button>
            </div>
          ))}
        </div>
        </article>
      )}

      {activeReport && (
        <>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {activeReport === "ventas"
                    ? `Reporte de Ventas - ${new Date().toLocaleDateString("es-NI")}`
                    : activeReport === "productos-top"
                    ? "Reporte de Productos Más Vendidos"
                    : activeReport === "meseros"
                    ? "Reporte de Ventas por Mesero"
                    : activeReport === "categorias"
                    ? "Reporte de Ventas por Categoría"
                    : activeReport === "movimientos"
                    ? "Reporte de Movimientos de Inventario"
                    : "Reporte de Historial de Caja"}
                </h3>
                <p className="text-sm text-slate-500">Filtra por rango de fechas para consultar resultados.</p>
              </div>
              <button
                onClick={() => {
                  setActiveReport(null);
                  setRows([]);
                  setSummary(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Volver al catálogo
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Desde</label>
                <input
                  type="date"
                  value={range.desde}
                  onChange={(e) => setRange((r) => ({ ...r, desde: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Hasta</label>
                <input
                  type="date"
                  value={range.hasta}
                  onChange={(e) => setRange((r) => ({ ...r, hasta: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {activeReport === "productos-top" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Top</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={range.top}
                    onChange={(e) => setRange((r) => ({ ...r, top: Number(e.target.value || 10) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-24"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-transparent">Acciones</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadReportData(activeReport)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Filtrar
                  </button>
                  <button
                    onClick={() => downloadExcel(activeReport)}
                    disabled={exporting}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Exportar Excel
                  </button>
                </div>
              </div>
            </div>
          </article>

          {loading ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Cargando reporte...</p>
            </article>
          ) : (
            <>
              {activeReport === "ventas" && summary && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Total ventas</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{formatCurrency(summary.totalVentas, currencySymbol)}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Total órdenes</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{summary.totalOrdenes}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Promedio ticket</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{formatCurrency(summary.promedioTicket, currencySymbol)}</p>
                  </article>
                </div>
              )}
              {activeReport === "productos-top" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-slate-800">Top productos</h4>
                    <p className="text-sm text-slate-500">
                      Productos ordenados por cantidad vendida y total de ventas en el periodo seleccionado.
                    </p>
                  </div>

                  {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <p className="text-sm font-medium text-slate-700">Sin datos para el periodo seleccionado.</p>
                      <p className="mt-1 text-xs text-slate-500">Prueba ampliando el rango de fechas o quitando filtros.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">#</th>
                            <th className="px-2 py-2">Producto</th>
                            <th className="px-2 py-2">Cantidad</th>
                            <th className="px-2 py-2">Total ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={row.id || row.fecha || i} className="border-b border-slate-100">
                              <td className="px-2 py-2 font-medium text-slate-700">{i + 1}</td>
                              <td className="px-2 py-2 text-slate-800">{row.nombre || row.producto || `Producto ${i + 1}`}</td>
                              <td className="px-2 py-2 text-slate-700">{row.cantidad ?? row.unidades ?? 0}</td>
                              <td className="px-2 py-2 font-semibold text-slate-800">
                                {formatCurrency(row.venta ?? row.total ?? 0, currencySymbol)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
              {activeReport === "meseros" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-3 text-base font-semibold text-slate-800">Ventas por mesero</h4>
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin datos para el período seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">Mesero</th>
                            <th className="px-2 py-2">Órdenes</th>
                            <th className="px-2 py-2">Total ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={`${row.mesero}-${i}`} className="border-b border-slate-100">
                              <td className="px-2 py-2">{row.mesero}</td>
                              <td className="px-2 py-2">{row.ordenes}</td>
                              <td className="px-2 py-2 font-semibold">{formatCurrency(row.venta ?? 0, currencySymbol)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
              {activeReport === "categorias" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-3 text-base font-semibold text-slate-800">Ventas por categoría</h4>
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin datos para el período seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">Categoría</th>
                            <th className="px-2 py-2 text-center">Items vendidos</th>
                            <th className="px-2 py-2 text-right">Total ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={`cat-${row.categoriaId ?? row.CategoriaProductoId ?? i}-${i}`} className="border-b border-slate-100">
                              <td className="px-2 py-2">{categoriaReporteNombre(row, i)}</td>
                              <td className="px-2 py-2 text-center font-medium">{row.cantidad ?? row.totalArticulos ?? 0}</td>
                              <td className="px-2 py-2 text-right font-semibold">{formatCurrency(row.total ?? row.venta ?? 0, currencySymbol)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
              {activeReport === "caja" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-3 text-base font-semibold text-slate-800">Historial de cierres de caja</h4>
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin cierres para el período seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">Cierre</th>
                            <th className="px-2 py-2">Fecha</th>
                            <th className="px-2 py-2">Estado</th>
                            <th className="px-2 py-2">Monto real</th>
                            <th className="px-2 py-2">Total ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={`${cierreId(row) ?? i}`} className="border-b border-slate-100">
                              <td className="px-2 py-2">#{cierreId(row) ?? "-"}</td>
                              <td className="px-2 py-2">{String(cierreFechaRaw(row) || "-").slice(0, 10)}</td>
                              <td className="px-2 py-2">{row.estado ?? row.Estado ?? "-"}</td>
                              <td className="px-2 py-2">{formatCurrency(cierreHistorialMontoPrincipal(row), currencySymbol)}</td>
                              <td className="px-2 py-2 font-semibold">{formatCurrency(cierreHistorialTotalVentas(row), currencySymbol)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
              {activeReport === "movimientos" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-3 text-base font-semibold text-slate-800">Movimientos de inventario</h4>
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin movimientos para el período seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">Fecha</th>
                            <th className="px-2 py-2">Producto</th>
                            <th className="px-2 py-2">Tipo</th>
                            <th className="px-2 py-2">Cant. Anterior</th>
                            <th className="px-2 py-2">Variación</th>
                            <th className="px-2 py-2">Cant. Nueva</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => {
                            const date = row.fecha || row.createdAt || "";
                            const variation = Number(row.cantidad || 0);
                            return (
                              <tr key={`mov-${row.id || i}`} className="border-b border-slate-100">
                                <td className="px-2 py-2 text-slate-500">{String(date).slice(0, 16).replace("T", " ")}</td>
                                <td className="px-2 py-2 font-medium">{row.productoNombre || row.producto?.nombre || `Item #${row.productoId || i}`}</td>
                                <td className="px-2 py-2">
                                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    String(row.tipo).toLowerCase().includes("entrada") ? "bg-green-100 text-green-700" :
                                    String(row.tipo).toLowerCase().includes("salida") ? "bg-red-100 text-red-700" :
                                    "bg-blue-100 text-blue-700"
                                  }`}>
                                    {row.tipo || row.subtipo || "-"}
                                  </span>
                                </td>
                                <td className="px-2 py-2">{row.cantidadAnterior ?? "-"}</td>
                                <td className={`px-2 py-2 font-semibold ${variation > 0 ? "text-green-600" : variation < 0 ? "text-red-600" : "text-slate-600"}`}>
                                  {variation > 0 ? "+" : ""}{variation}
                                </td>
                                <td className="px-2 py-2">{row.cantidadNueva ?? "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
              {activeReport === "ventas" && (
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-3 text-base font-semibold text-slate-800">Órdenes del Período</h4>
                  {orders.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay órdenes en el período seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-2 py-2">Número</th>
                            <th className="px-2 py-2">Fecha</th>
                            <th className="px-2 py-2">Origen</th>
                            <th className="px-2 py-2">Referencia</th>
                            <th className="px-2 py-2">Mesero</th>
                            <th className="px-2 py-2">Monto</th>
                            <th className="px-2 py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={o.key} className="border-b border-slate-100">
                              <td className="px-2 py-2">{o.numero}</td>
                              <td className="px-2 py-2">{String(o.fecha).slice(0, 10) || "-"}</td>
                              <td className="px-2 py-2">{o.origen}</td>
                              <td className="px-2 py-2">{o.referencia}</td>
                              <td className="px-2 py-2">{o.mesero}</td>
                              <td className="px-2 py-2">{formatCurrency(o.monto, currencySymbol)}</td>
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => openOrderDetail(o)}
                                  className="inline-flex items-center text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
                                  title="Ver detalle"
                                >
                                  Ver detalle
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )}
            </>
          )}
        </>
      )}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <article className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-800">Detalle de orden</h4>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {detailLoading ? (
              <p className="text-sm text-slate-500">Cargando detalle...</p>
            ) : !detailOrder ? (
              <p className="text-sm text-slate-500">Sin información para mostrar.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <p><span className="font-medium text-slate-700">Número:</span> {detailOrder.numero || detailOrder.codigo || "-"}</p>
                  <p><span className="font-medium text-slate-700">Estado:</span> {detailOrder.estado || "-"}</p>
                  <p><span className="font-medium text-slate-700">Mesa/Ref:</span> {detailOrder.mesa || detailOrder.clienteNombre || "-"}</p>
                  <p><span className="font-medium text-slate-700">Mesero:</span> {detailOrder.mesero || "-"}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-2 py-2">Producto</th>
                        <th className="px-2 py-2">Cantidad</th>
                        <th className="px-2 py-2">P/U</th>
                        <th className="px-2 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((detailOrder.items || detailOrder.Items || []).length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-slate-500">Sin productos.</td>
                        </tr>
                      )}
                      {(detailOrder.items || detailOrder.Items || []).map((it, i) => (
                        <tr key={`${it.id || i}`} className="border-b border-slate-100">
                          <td className="px-2 py-2">{it.servicio || it.producto || "-"}</td>
                          <td className="px-2 py-2">{it.cantidad || 0}</td>
                          <td className="px-2 py-2">{formatCurrency(it.precioUnitario || 0, currencySymbol)}</td>
                          <td className="px-2 py-2">{formatCurrency(it.monto || it.subtotal || 0, currencySymbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}

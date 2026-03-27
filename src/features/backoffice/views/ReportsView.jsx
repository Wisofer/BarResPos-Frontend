import { useEffect, useState } from "react";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";
import { backofficeApi } from "../services/backofficeApi.js";
import { formatCurrency } from "../utils/currency.js";
import { BarChart3, Boxes, CircleDollarSign, Tags, Users } from "lucide-react";

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

  const downloadExcel = async (type) => {
    setExporting(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (range.desde) query.set("desde", range.desde);
      if (range.hasta) query.set("hasta", range.hasta);
      if (type === "productos-top") query.set("top", String(range.top || 10));
      const url = `${getApiUrl()}/api/v1/reportes/${type}/excel${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error("No se pudo exportar el reporte.");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = type === "resumen-ventas" ? "reporte-resumen-ventas.xlsx" : "reporte-productos-top.xlsx";
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
      const query = { desde: range.desde || undefined, hasta: range.hasta || undefined };
      if (reportId === "ventas") {
        const [data, pedidos] = await Promise.all([
          backofficeApi.reportesResumenVentas(query),
          backofficeApi.listPedidos({ ...query, page: 1, pageSize: 100 }),
        ]);
        const details = Array.isArray(data?.desglosePorDia) ? data.desglosePorDia : data?.dias || [];
        const ordersItems = Array.isArray(pedidos?.items) ? pedidos.items : [];
        setRows(details);
        setOrders(
          ordersItems.map((o, i) => ({
            id: o.id || i,
            numero: o.numero || o.codigo || `#${1200 + i}`,
            fecha: o.fecha || o.fechaCreacion || "",
            mesa: o.mesa || o.mesaNumero || "-",
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
        const data = await backofficeApi.reportesProductosTop({ ...query, top: range.top || 10 });
        setRows(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
        setSummary(null);
      } else if (reportId === "meseros") {
        const pedidos = await backofficeApi.listPedidos({ ...query, page: 1, pageSize: 500 });
        const items = Array.isArray(pedidos?.items) ? pedidos.items : [];
        const grouped = items.reduce((acc, p) => {
          const key = p.mesero || p.usuario || "Sin mesero";
          const curr = acc.get(key) || { mesero: key, ordenes: 0, venta: 0 };
          curr.ordenes += 1;
          curr.venta += Number(p.monto ?? p.total ?? 0);
          acc.set(key, curr);
          return acc;
        }, new Map());
        const result = Array.from(grouped.values()).sort((a, b) => b.venta - a.venta);
        setRows(result);
        const totalVentas = result.reduce((sum, r) => sum + Number(r.venta || 0), 0);
        const totalOrdenes = result.reduce((sum, r) => sum + Number(r.ordenes || 0), 0);
        setSummary({
          totalVentas,
          totalOrdenes,
          promedioTicket: totalOrdenes > 0 ? totalVentas / totalOrdenes : 0,
        });
      } else if (reportId === "categorias") {
        const data = await backofficeApi.dashboardResumen(query);
        const categories = Array.isArray(data?.ventasPorCategoria) ? data.ventasPorCategoria : [];
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
      }
    } catch (e) {
      setRows([]);
      setSummary(null);
      setError(e.message || "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport) loadReportData(activeReport);
  }, [activeReport]);

  return (
    <div className="space-y-4">
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
                  {activeReport === "ventas" ? `Reporte de Ventas - ${new Date().toLocaleDateString("es-NI")}` : "Reporte de Productos Más Vendidos"}
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
                    onClick={() => downloadExcel(activeReport === "ventas" ? "resumen-ventas" : "productos-top")}
                    disabled={exporting || (activeReport !== "ventas" && activeReport !== "productos-top")}
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
                            <th className="px-2 py-2">Total ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={`${row.categoria || row.nombre || "cat"}-${i}`} className="border-b border-slate-100">
                              <td className="px-2 py-2">{row.categoria || row.nombre || `Categoría ${i + 1}`}</td>
                              <td className="px-2 py-2 font-semibold">{formatCurrency(row.total ?? row.venta ?? 0, currencySymbol)}</td>
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
                            <tr key={`${row.id || i}`} className="border-b border-slate-100">
                              <td className="px-2 py-2">#{row.id || "-"}</td>
                              <td className="px-2 py-2">{String(row.fechaCierre || row.fecha || "-").slice(0, 10)}</td>
                              <td className="px-2 py-2">{row.estado || "-"}</td>
                              <td className="px-2 py-2">{formatCurrency(row.montoReal ?? row.total ?? 0, currencySymbol)}</td>
                              <td className="px-2 py-2 font-semibold">{formatCurrency(row.totalVentas ?? row.total ?? 0, currencySymbol)}</td>
                            </tr>
                          ))}
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
                            <th className="px-2 py-2">Mesa</th>
                            <th className="px-2 py-2">Mesero</th>
                            <th className="px-2 py-2">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={o.id} className="border-b border-slate-100">
                              <td className="px-2 py-2">{o.numero}</td>
                              <td className="px-2 py-2">{String(o.fecha).slice(0, 10) || "-"}</td>
                              <td className="px-2 py-2">{o.mesa}</td>
                              <td className="px-2 py-2">{o.mesero}</td>
                              <td className="px-2 py-2">{formatCurrency(o.monto, currencySymbol)}</td>
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
    </div>
  );
}

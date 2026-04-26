import { CircleDollarSign, ClipboardList, Clock3, ShoppingBag, Sparkles, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficePageShell, BackofficeStatCardsListSkeleton } from "../components/index.js";
import { formatCurrency } from "../utils/currency.js";
import { buildDashboardSalesSeries, dashboardTransaccionesHoy } from "../utils/dashboardResumen.js";

const icons = [ClipboardList, BarChart3, CircleDollarSign, Clock3];
const TOP_PRODUCTOS = 3;

/** Tonos verde / esmeralda para porciones del pastel. */
const PIE_COLORS = ["#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#14b8a6", "#0d9488", "#065f46"];

/** Debe coincidir con `title` en `setStats` para el bloque «Resumen del día». */
const RESUMEN_DIA_KEYS = ["Ventas de Hoy", "Ingresos (C$)", "Ticket Promedio", "Ventas del Mes"];

function readKpi(dashboard, kpis, ...keys) {
  for (const k of keys) {
    const v = kpis?.[k] ?? dashboard?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

export function DashboardView({ currencySymbol = "C$" }) {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [salesSeries, setSalesSeries] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stats, setStats] = useState([]);
  const [rangeLabel, setRangeLabel] = useState("");
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);

  useEffect(() => {
    let mounted = true;
    backofficeApi
      .dashboardResumen({ topProductos: TOP_PRODUCTOS })
      .then((dashboard) => {
        if (!mounted) return;
        const kpis = dashboard?.kpis || {};
        const topItems = dashboard?.topProductos || [];
        const serieItems = dashboard?.serieVentas || [];
        const categoriasItems = dashboard?.ventasPorCategoria || kpis?.ventasPorCategoria || [];
        const lowStockItems = dashboard?.productosStockBajoLista || [];
        const rango = dashboard?.rango || {};

        const totalVentasValor = Number(
          readKpi(dashboard, kpis, "totalVentasHoy", "TotalVentasHoy") ?? 0
        );
        const ticketPromedio = Number(
          readKpi(dashboard, kpis, "ticketPromedioHoy", "TicketPromedioHoy") ?? 0
        );
        const ventasHoyCount = dashboardTransaccionesHoy(dashboard);
        const totalCajaHoy = Number(
          readKpi(dashboard, kpis, "totalCajaHoy", "TotalCajaHoy") ?? 0
        );
        const ventasMes = Number(readKpi(dashboard, kpis, "ventasMes", "VentasMes") ?? 0);
        const ventasSemana = Number(readKpi(dashboard, kpis, "ventasSemana", "VentasSemana") ?? 0);

        const desdeLabel = String(rango?.desde ?? rango?.Desde ?? "").slice(0, 10);
        const hastaLabel = String(rango?.hasta ?? rango?.Hasta ?? "").slice(0, 10);
        setRangeLabel(desdeLabel && hastaLabel ? `${desdeLabel} - ${hastaLabel}` : "Rango por defecto");

        setTopProducts(
          topItems.slice(0, TOP_PRODUCTOS).map((x) => ({
            name: x.producto || x.nombre || x.Producto || "Producto",
            sold: x.cantidad ?? x.Cantidad ?? 0,
            amount: formatCurrency(x.venta || x.Venta || x.total || 0, currencySymbol),
          }))
        );
        setSalesByCategory(
          categoriasItems.slice(0, 4).map((c) => ({
            name: c.nombreCategoria || c.NombreCategoria || "Categoría",
            total: formatCurrency(c.total ?? c.Total ?? 0, currencySymbol),
          }))
        );
        setLowStockProducts(
          lowStockItems.slice(0, 4).map((p) => ({
            name: p.nombre || p.Nombre || "Producto",
            stock: p.stock ?? p.Stock ?? 0,
            min: p.stockMinimo ?? p.StockMinimo ?? 0,
          }))
        );

        setSalesSeries(buildDashboardSalesSeries(serieItems, ventasMes));
        setStats([
          { title: "Ventas de Hoy", value: String(ventasHoyCount), detail: "Transacciones realizadas" },
          {
            title: "Ingresos (C$)",
            value: formatCurrency(totalVentasValor, currencySymbol),
            detail: `Efectivo en caja: ${formatCurrency(totalCajaHoy, currencySymbol)}`,
          },
          { title: "Ticket Promedio", value: formatCurrency(ticketPromedio, currencySymbol), detail: "Valor medio por ticket" },
          { title: "Ventas del Mes", value: formatCurrency(ventasMes, currencySymbol), detail: "Acumulado mensual bruto" },
        ]);
        setMonthRevenue(ventasMes);
        setWeekRevenue(ventasSemana);
      })
      .catch(() => {
        if (!mounted) return;
        setStats([
          { title: "Ventas de Hoy", value: "0", detail: "Sin datos" },
          { title: "Ingresos (C$)", value: formatCurrency(0, currencySymbol), detail: "Sin datos" },
          { title: "Ticket Promedio", value: formatCurrency(0, currencySymbol), detail: "Sin datos" },
          { title: "Ventas del Mes", value: formatCurrency(0, currencySymbol), detail: "Sin datos" },
        ]);
        setSalesSeries([]);
        setSalesByCategory([]);
        setLowStockProducts([]);
        setMonthRevenue(0);
        setWeekRevenue(0);
        setRangeLabel("Sin datos");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currencySymbol]);

  const safeProducts = useMemo(() => topProducts.slice(0, TOP_PRODUCTOS), [topProducts]);
  const statsByTitle = useMemo(() => {
    const m = new Map();
    (stats || []).forEach((s) => {
      if (s?.title) m.set(s.title, s);
    });
    return m;
  }, [stats]);
  const totalIncomeSinceStart = useMemo(
    () => salesSeries.reduce((sum, point) => sum + Number(point.total || 0), 0),
    [salesSeries]
  );

  if (loading) {
    return <BackofficeStatCardsListSkeleton listRows={4} maxWidth="7xl" />;
  }

  return (
    <BackofficePageShell maxWidth="7xl" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, idx) => {
          const Icon = icons[idx];
          return (
            <article key={item.title} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm text-slate-500">{item.title}</p>
                <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="space-y-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-800">Rendimiento comercial</h2>
            <span className="shrink-0 rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700">En línea</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Mes actual</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(monthRevenue, currencySymbol)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Semana</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(weekRevenue, currencySymbol)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">En el gráfico (período)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalIncomeSinceStart, currencySymbol)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ventas por categoría</p>
              {salesByCategory.length === 0 ? (
                <p className="text-xs text-slate-500">Sin datos de categorías.</p>
              ) : (
                <div className="space-y-2">
                  {salesByCategory.map((c) => (
                    <div key={c.name} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-700">{c.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">{c.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Stock bajo</p>
              {lowStockProducts.length === 0 ? (
                <p className="text-xs text-slate-500">Sin alertas de inventario.</p>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map((p) => (
                    <div key={p.name} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-700">{p.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-amber-700">
                        {p.stock}/{p.min}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <article className="flex min-h-[260px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex shrink-0 items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-800">Productos más vendidos</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {safeProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos de productos.</p>
              ) : (
                safeProducts.map((product) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ShoppingBag className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sold} vendidos</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{product.amount}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="flex min-h-[260px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-800">Resumen del día</h2>
              <ClipboardList className="h-5 w-5 shrink-0 text-slate-400" />
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              {RESUMEN_DIA_KEYS.map((title) => {
                const s = statsByTitle.get(title);
                if (!s) return null;
                return (
                  <div key={title} className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/90 p-3">
                    <p className="text-[11px] font-medium leading-tight text-slate-500">{title}</p>
                    <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{s.value}</p>
                    <p className="mt-auto pt-1 text-[11px] leading-snug text-slate-500">{s.detail}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-800">Ingresos (período actual)</h2>
                <Clock3 className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
              <p className="mt-1 text-xs text-slate-500">Mes en curso (KPI principal)</p>
              <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
                {formatCurrency(monthRevenue, currencySymbol)}
              </p>
            </div>
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Total en el gráfico (serie)</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(totalIncomeSinceStart, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Semana</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(weekRevenue, currencySymbol)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Rango de la serie: <span className="font-medium text-slate-600">{rangeLabel}</span>
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Distribución (por día o mes)</p>
              <div className="h-[200px] w-full min-w-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80 p-1">
                {salesSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-500">Sin datos para el gráfico.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
                      <Pie
                        data={salesSeries}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="38%"
                        outerRadius="70%"
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {salesSeries.map((row, index) => (
                          <Cell key={`slice-${row?.key ?? index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value || 0), currencySymbol)}
                        contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "12px" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        wrapperStyle={{ fontSize: "10px" }}
                        formatter={(value) => value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </article>

          <article className="flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 p-4 shadow-sm sm:min-h-[280px] lg:min-h-0">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evolución de ingresos</p>
            </div>
            <div className="h-56 min-h-[200px] flex-1 overflow-hidden rounded-lg border border-white/60 bg-white/50 p-2 shadow-inner backdrop-blur-[2px] sm:h-60">
              {salesSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin datos de la serie.</div>
              ) : (
                <ResponsiveContainer className="min-w-0" width="100%" height="100%">
                  <BarChart data={salesSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardSalesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value || 0), currencySymbol)}
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="total" fill="url(#dashboardSalesFill)" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-2 shrink-0 text-xs text-slate-500">Rango: {rangeLabel}</p>
          </article>
        </div>
      </div>
    </BackofficePageShell>
  );
}

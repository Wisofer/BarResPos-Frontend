import { CircleDollarSign, ClipboardList, Clock3, ShoppingBag, Sparkles, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton, StatCardsSkeleton } from "../components/index.js";
import { formatCurrency } from "../utils/currency.js";

const icons = [ClipboardList, BarChart3, CircleDollarSign, Clock3];

function parseSeriesDate(rawDate) {
  if (!rawDate) return null;
  const asString = String(rawDate).trim();

  const direct = new Date(asString);
  if (!Number.isNaN(direct.getTime())) return direct;

  const ymd = asString.match(/^(\d{4})-(\d{2})$/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, 1);

  const my = asString.match(/^(\d{2})\/(\d{4})$/);
  if (my) return new Date(Number(my[2]), Number(my[1]) - 1, 1);

  return null;
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
      .dashboardResumen({ topProductos: 3 })
      .then((dashboard) => {
        if (!mounted) return;
        const kpis = dashboard?.kpis || {};
        const topItems = dashboard?.topProductos || [];
        const serieItems = dashboard?.serieVentas || [];
        const categoriasItems = dashboard?.ventasPorCategoria || kpis?.ventasPorCategoria || [];
        const lowStockItems = dashboard?.productosStockBajoLista || [];
        const rango = dashboard?.rango || {};

        const ordenesHoy = kpis?.totalOrdenesHoy ?? kpis?.ordenesHoy ?? dashboard?.totalOrdenesHoy ?? 0;
        const mesasActivas = kpis?.mesasOcupadas ?? dashboard?.mesasOcupadas ?? 0;
        const ingresoDiario = kpis?.totalVentasHoy ?? dashboard?.totalVentasHoy ?? 0;
        const ticketPromedio = kpis?.ticketPromedioHoy ?? dashboard?.ticketPromedioHoy ?? 0;
        const ventasMes = kpis?.ventasMes ?? dashboard?.ventasMes ?? 0;
        const ventasSemana = kpis?.ventasSemana ?? dashboard?.ventasSemana ?? 0;

        const desdeLabel = String(rango?.desde || "").slice(0, 10);
        const hastaLabel = String(rango?.hasta || "").slice(0, 10);
        setRangeLabel(desdeLabel && hastaLabel ? `${desdeLabel} - ${hastaLabel}` : "Rango por defecto");

        setTopProducts(
          topItems.slice(0, 3).map((x) => ({
            name: x.producto || x.nombre || "Producto",
            sold: x.cantidad || 0,
            amount: formatCurrency(x.venta || x.total || 0, currencySymbol),
          }))
        );
        setSalesByCategory(
          categoriasItems.slice(0, 4).map((c) => ({
            name: c.nombreCategoria || "Categoría",
            total: formatCurrency(c.total || 0, currencySymbol),
          }))
        );
        setLowStockProducts(
          lowStockItems.slice(0, 4).map((p) => ({
            name: p.nombre || "Producto",
            stock: p.stock ?? 0,
            min: p.stockMinimo ?? 0,
          }))
        );
        const byMonth = new Map();
        serieItems.forEach((s) => {
          const rawDate = s?.fecha || s?.dia || s?.label || s?.mes;
          const value = Number(s?.monto || s?.totalVentas || s?.total || s?.ventas || 0);
          if (!rawDate) return;
          const parsed = parseSeriesDate(rawDate);
          if (!parsed) return;
          const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
          byMonth.set(key, (byMonth.get(key) || 0) + value);
        });
        let monthlySeries = Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, total]) => {
            const [year, month] = key.split("-");
            const date = new Date(Number(year), Number(month) - 1, 1);
            return {
              key,
              name: date.toLocaleString("es-NI", { month: "short" }).replace(".", ""),
              total,
            };
          });
        if (monthlySeries.length === 0 && Number(ventasMes) > 0) {
          const current = new Date();
          monthlySeries = [
            {
              key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
              name: current.toLocaleString("es-NI", { month: "short" }).replace(".", ""),
              total: Number(ventasMes),
            },
          ];
        }
        setSalesSeries(monthlySeries);
        setStats([
          { title: "Ordenes hoy", value: String(ordenesHoy), detail: `${kpis?.ordenesPendientesPago ?? 0} pendientes de pago` },
          { title: "Mesas ocupadas", value: String(mesasActivas), detail: "Fuente: dashboard/resumen" },
          { title: "Ventas hoy", value: formatCurrency(ingresoDiario, currencySymbol), detail: `Caja hoy: ${formatCurrency(kpis?.totalCajaHoy ?? 0, currencySymbol)}` },
          { title: "Ticket promedio", value: formatCurrency(ticketPromedio, currencySymbol), detail: "Promedio actual" },
        ]);
        setMonthRevenue(Number(ventasMes || 0));
        setWeekRevenue(Number(ventasSemana || 0));
      })
      .catch(() => {
        if (!mounted) return;
        setStats([
          { title: "Ordenes hoy", value: "0", detail: "Sin datos" },
          { title: "Mesas ocupadas", value: "0", detail: "Sin datos" },
          { title: "Ventas hoy", value: formatCurrency(0, currencySymbol), detail: "Sin datos" },
          { title: "Ticket promedio", value: formatCurrency(0, currencySymbol), detail: "Sin datos" },
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

  const safeProducts = useMemo(() => topProducts.slice(0, 3), [topProducts]);
  const totalIncomeSinceStart = useMemo(
    () => salesSeries.reduce((sum, point) => sum + Number(point.total || 0), 0),
    [salesSeries]
  );
  if (loading) return <><StatCardsSkeleton /><ListSkeleton rows={4} /></>;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, idx) => {
          const Icon = icons[idx];
          return (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.title}</p>
                <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.45fr_1fr]">
        <section className="space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Indicadores de ingreso</h2>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">Resumen</span>
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
                <p className="text-xs text-slate-500">Desde inicio</p>
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
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{c.name}</span>
                        <span className="font-semibold text-slate-900">{c.total}</span>
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
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{p.name}</span>
                        <span className="font-semibold text-amber-700">
                          {p.stock}/{p.min}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>

        <article className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Ingresos mensuales</h2>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 h-52 rounded-lg border border-slate-100 bg-slate-50 p-2">
              {salesSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin datos de ingresos mensuales.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value || 0), currencySymbol)}
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="total" fill="#16a34a" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Rango: {rangeLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-800">Top productos</h2>
            </div>
            <div className="space-y-3">
              {safeProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sold} vendidos</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{product.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

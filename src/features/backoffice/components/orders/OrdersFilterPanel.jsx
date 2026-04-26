import { Search } from "lucide-react";
import { cn } from "../../../../utils/cn.js";
import { ORDERS_QUICK_STATES, ORDERS_TIPO_FILTERS } from "../../constants/ordersView.js";

const chip = (active, variant) =>
  cn(
    "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium transition",
    active
      ? variant === "amber"
        ? "border-amber-600 bg-amber-600 text-white"
        : "border-slate-800 bg-slate-800 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  );

export function OrdersFilterPanel({
  filters,
  setFilters,
  searchTerm,
  setSearchTerm,
  applyQuickStatus,
  applyTipoFilter,
  showEmptyDrafts,
  setShowEmptyDrafts,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</span>
          {ORDERS_QUICK_STATES.map((s) => (
            <button key={s || "todos"} type="button" onClick={() => applyQuickStatus(s)} className={chip(filters.estado === s, "dark")}>
              {s || "Todos"}
            </button>
          ))}
        </div>
        <div className="hidden h-4 w-px shrink-0 bg-slate-200 lg:block" aria-hidden />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origen</span>
          {ORDERS_TIPO_FILTERS.map((tf) => (
            <button
              key={tf.value || "all-tipo"}
              type="button"
              onClick={() => applyTipoFilter(tf.value)}
              className={chip(filters.tipo === tf.value, "amber")}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pedido o destino…"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-sm"
          />
        </div>
        <input
          type="date"
          value={filters.desde}
          onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))}
          className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          value={filters.hasta}
          onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))}
          className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
        />
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={showEmptyDrafts}
          onChange={(e) => setShowEmptyDrafts(Boolean(e.target.checked))}
          className="h-4 w-4 rounded border-slate-300"
        />
        Mostrar borradores/vacios
      </label>
    </div>
  );
}

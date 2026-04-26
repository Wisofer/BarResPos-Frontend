import { Download, Filter, RefreshCcw, Search } from "lucide-react";

const filtrosVentas = [
  { value: "todas", label: "Todas" },
  { value: "anuladas", label: "Anuladas" },
  { value: "mesa", label: "Mesa" },
  { value: "delivery", label: "Delivery" },
];

const topOptions = [5, 10, 15, 20];

export function ReportFilters({
  activeReport,
  dateFilters,
  setDateFilters,
  search,
  setSearch,
  filtroVentas,
  setFiltroVentas,
  topN,
  setTopN,
  loading,
  loadReportData,
  exportReport,
  exportCategoriaDesglose,
  resetFilters,
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Desde</span>
          <input
            type="date"
            value={dateFilters.desde}
            onChange={(e) => setDateFilters((p) => ({ ...p, desde: e.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Hasta</span>
          <input
            type="date"
            value={dateFilters.hasta}
            onChange={(e) => setDateFilters((p) => ({ ...p, hasta: e.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por texto..."
              className="h-10 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm"
            />
          </div>
        </label>
      </div>

      {(activeReport === "ventas" || activeReport === "productos-top") && (
        <div className="flex flex-wrap items-center gap-2">
          {activeReport === "ventas" &&
            filtrosVentas.map((op) => (
              <button
                type="button"
                key={op.value}
                onClick={() => setFiltroVentas(op.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filtroVentas === op.value ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {op.label}
              </button>
            ))}

          {activeReport === "productos-top" && (
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              <span>Top</span>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
              >
                {topOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadReportData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-70"
        >
          <Filter className="h-4 w-4" />
          Filtrar
        </button>
        <button
          type="button"
          onClick={resetFilters}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <RefreshCcw className="h-4 w-4" />
          Limpiar
        </button>
        <button
          type="button"
          onClick={exportReport}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          <Download className="h-4 w-4" />
          {activeReport === "categorias" ? "Resumen por categoría" : "Exportar Excel"}
        </button>
        {activeReport === "categorias" && typeof exportCategoriaDesglose === "function" ? (
          <button
            type="button"
            onClick={exportCategoriaDesglose}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Desglose (Excel)
          </button>
        ) : null}
      </div>
    </div>
  );
}

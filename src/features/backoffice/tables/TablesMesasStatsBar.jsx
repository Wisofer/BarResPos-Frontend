import { LayoutGrid, Map } from "lucide-react";

export function TablesMesasStatsBar({
  total,
  libres,
  ocupadas,
  reservadas,
  cajaAbierta,
  onUbicaciones,
  onNuevaMesa,
  layoutMode = "zonas",
  onLayoutModeChange,
}) {
  return (
    <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:mb-4">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 sm:px-3 sm:py-1.5 sm:text-xs">
          Total: {total}
        </span>
        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 sm:px-3 sm:py-1.5 sm:text-xs">
          Libres: {libres}
        </span>
        <span className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200/80 sm:px-3 sm:py-1.5 sm:text-xs">
          Ocupadas: {ocupadas}
        </span>
        <span className="rounded-lg bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white ring-1 ring-violet-800/80 sm:px-3 sm:py-1.5 sm:text-xs">
          Reservadas: {reservadas}
        </span>
        <span
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs ${cajaAbierta ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {typeof onLayoutModeChange === "function" && (
          <div className="mr-1 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => onLayoutModeChange("zonas")}
              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                layoutMode === "zonas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Vista por zonas"
            >
              <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Zonas
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange("plano")}
              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                layoutMode === "plano" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Vista plano (arrastrar mesas)"
            >
              <Map className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Plano
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onUbicaciones}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 sm:px-3 sm:py-2 sm:text-xs"
        >
          Ubicaciones
        </button>
        <button
          type="button"
          onClick={onNuevaMesa}
          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 sm:px-3 sm:py-2 sm:text-xs"
        >
          Nueva mesa
        </button>
      </div>
    </div>
  );
}

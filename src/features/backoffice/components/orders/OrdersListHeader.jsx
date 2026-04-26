import { Download } from "lucide-react";

export function OrdersListHeader({ onExport, exporting }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-slate-900">Pedidos</h1>
        <p className="text-sm text-slate-500">Listado de todos los pedidos; usá filtros y la tabla para el detalle.</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exportando…" : "Exportar Excel"}
        </button>
      </div>
    </div>
  );
}

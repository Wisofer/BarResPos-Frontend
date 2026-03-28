import { MoreVertical, Pencil, Trash2, Lock } from "lucide-react";
import { mesaCardShellClass } from "./mesaVisual.js";

export function TablesMesaCard({
  table,
  cajaAbierta,
  isAdmin,
  tableIllustration,
  activeTableMenu,
  setActiveTableMenu,
  onOpenPos,
  onOpenEdit,
  onRequestDelete,
}) {
  const { shell, onDark } = mesaCardShellClass(table);

  return (
    <article
      className={`relative group rounded-xl border-2 p-3 shadow-sm transition ${
        cajaAbierta ? "hover:-translate-y-0.5 hover:shadow" : "opacity-95"
      } ${shell}`}
    >
      {!cajaAbierta && <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/20" />}
      {isAdmin && (
        <>
          <div className="absolute right-2 top-2 z-20 hidden gap-1 lg:flex opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenEdit(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 hover:bg-white"
              title="Editar mesa"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRequestDelete(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white/90 text-red-600 hover:bg-white"
              title="Borrar mesa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute right-2 top-2 z-50 lg:hidden">
            <button
              type="button"
              data-table-menu-trigger
              aria-label="Acciones de mesa"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveTableMenu((curr) => (curr === table.id ? null : table.id));
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 hover:bg-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {activeTableMenu === table.id && (
              <div
                data-table-menu
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 z-[60] w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTableMenu(null);
                    onOpenEdit(table.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTableMenu(null);
                    onRequestDelete(table.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Borrar
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <p className={`text-xs font-bold uppercase ${onDark ? "text-white" : "text-slate-800"}`}>{table.displayId}</p>
        {table.hasActiveOrder && table.activeOrdersCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1.5 text-[10px] font-bold text-white">
            {table.activeOrdersCount}
          </span>
        )}
      </div>

      <button type="button" onClick={() => onOpenPos(table)} className="w-full" disabled={!cajaAbierta}>
        <img src={tableIllustration} alt={`Mesa ${table.displayId}`} className="mx-auto h-28 w-full object-contain" />
      </button>

      {!cajaAbierta && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 inline-flex items-center justify-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700">
          <Lock className="h-3.5 w-3.5" />
          Bloqueada por caja cerrada
        </div>
      )}
    </article>
  );
}

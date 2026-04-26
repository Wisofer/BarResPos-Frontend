import { X } from "lucide-react";
import { BackofficeDialog } from "../BackofficeDialog.jsx";
import {
  formatMovementDate,
  movementProductId,
  movementProductLabel,
  movementTipoKind,
} from "../../utils/inventoryMovementsView.js";
import { cn } from "../../../../utils/cn.js";

function badgeClassForKind(kind) {
  if (kind === "entrada") return "bg-emerald-100 text-emerald-800";
  if (kind === "salida") return "bg-red-100 text-red-800";
  if (kind === "ajuste") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

function movimientoDetalle(m) {
  const sub = m.subtipo ?? m.Subtipo;
  if (sub && sub !== "-") return String(sub);
  const o = m.observaciones ?? m.Observaciones;
  if (o) return String(o);
  return "—";
}

function movimientoCantDisplay(m) {
  const c = m.cantidad ?? m.Cantidad;
  if (c == null || c === "") return "—";
  const n = Number(c);
  if (Number.isNaN(n)) return String(c);
  const k = movementTipoKind(m);
  if (k === "entrada") return `+${n}`;
  return String(n);
}

/**
 * Listado global de movimientos (misma línea visual que sistema-de-tienda, con columnas extra de saldo).
 */
export function GlobalMovementsModal({ open, onClose, movementRows, productListForLabel }) {
  if (!open) return null;

  return (
    <BackofficeDialog maxWidthClass="max-w-4xl" onBackdropClick={onClose} panelClassName="sm:mx-auto">
      <div className="flex w-full min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Movimientos de inventario</h3>
            <p className="mt-1 text-xs text-slate-500">Registros recientes del sistema (nombre resuelto desde el catálogo si el API solo manda el id).</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[min(70dvh,520px)] overflow-auto rounded-2xl border border-slate-200 ring-4 ring-slate-50">
          {movementRows.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold uppercase tracking-widest text-slate-400">No hay movimientos registrados.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3 sm:px-4">Fecha</th>
                  <th className="px-3 py-3 sm:px-4">Tipo</th>
                  <th className="px-3 py-3 sm:px-4">Producto</th>
                  <th className="px-3 py-3 sm:px-4 text-right">Cant.</th>
                  <th className="px-3 py-3 sm:px-4">Detalle</th>
                  <th className="px-3 py-3 sm:px-4 text-right">Inventario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {movementRows.map((m, i) => {
                  const kind = movementTipoKind(m);
                  const tipo = m.tipo ?? m.Tipo ?? "—";
                  const pid = movementProductId(m);
                  const name = movementProductLabel(m, productListForLabel);
                  const ant = m.stockAnterior ?? m.StockAnterior;
                  const nue = m.stockNuevo ?? m.StockNuevo;
                  return (
                    <tr key={m.id ?? m.Id ?? i} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold text-slate-500 sm:px-4">
                        {formatMovementDate(m) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight", badgeClassForKind(kind))}
                        >
                          {tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 sm:px-4">
                        {name}
                        {pid != null && <span className="ml-1 text-xs font-normal text-slate-400">#{pid}</span>}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right text-sm font-black tabular-nums",
                          kind === "entrada" && "text-emerald-600",
                          kind === "salida" && "text-red-600",
                          kind === "ajuste" && "text-sky-600"
                        )}
                      >
                        {movimientoCantDisplay(m)}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-xs text-slate-600 sm:px-4 sm:max-w-xs" title={movimientoDetalle(m)}>
                        {movimientoDetalle(m)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-slate-500 sm:px-4">
                        {ant != null && nue != null ? `${ant} → ${nue}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </BackofficeDialog>
  );
}

/**
 * Historial de un producto.
 */
export function ProductHistoryModal({ open, onClose, historyRows, selectedProductName }) {
  if (!open) return null;

  return (
    <BackofficeDialog onBackdropClick={onClose} maxWidthClass="max-w-2xl" panelClassName="sm:mx-auto">
      <div className="flex w-full min-w-0 flex-col">
        <h3 className="text-lg font-bold tracking-tight text-slate-800 sm:text-xl">Historial de stock</h3>
        <p className="text-xs font-bold uppercase tracking-widest text-primary-600">{selectedProductName}</p>

        <div className="mt-4 max-h-[min(50dvh,22rem)] overflow-auto rounded-2xl border border-slate-200 ring-4 ring-slate-50">
          {historyRows.length === 0 ? (
            <p className="p-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400">No hay movimientos registrados.</p>
          ) : (
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 sm:px-4">Fecha</th>
                  <th className="px-3 py-2.5 sm:px-4">Tipo</th>
                  <th className="px-3 py-2.5 sm:px-4">Detalle</th>
                  <th className="px-3 py-2.5 sm:px-4 text-right">Cant.</th>
                  <th className="px-3 py-2.5 sm:px-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRows.map((m, i) => {
                  const kind = movementTipoKind(m);
                  const tipo = m.tipo ?? m.Tipo ?? "—";
                  const sub = m.subtipo ?? m.Subtipo;
                  const cant = m.cantidad ?? m.Cantidad;
                  const ant = m.stockAnterior ?? m.StockAnterior;
                  const nue = m.stockNuevo ?? m.StockNuevo;
                  return (
                    <tr key={m.id ?? m.Id ?? i} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2 text-[10px] font-bold text-slate-500 sm:px-4">
                        {formatMovementDate(m) ?? "—"}
                      </td>
                      <td className="px-3 py-2 sm:px-4">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase",
                            kind === "entrada" && "text-emerald-600",
                            kind === "salida" && "text-red-600",
                            kind === "ajuste" && "text-sky-600"
                          )}
                        >
                          {tipo}
                        </span>
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-slate-600 sm:px-4 sm:max-w-[12rem]" title={sub && sub !== "-" ? sub : "—"}>
                        {sub && sub !== "-" ? sub : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right text-sm font-black tabular-nums",
                          kind === "entrada" && "text-emerald-600",
                          kind === "salida" && "text-red-600",
                          kind === "ajuste" && "text-sky-600"
                        )}
                      >
                        {kind === "entrada" && cant != null && cant !== "" && !Number.isNaN(Number(cant)) ? `+${cant}` : String(cant ?? "—")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-500 sm:px-4">
                        {ant != null && nue != null ? `${ant} → ${nue}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full min-h-11 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800 active:scale-[0.98] sm:min-h-0"
        >
          Cerrar
        </button>
      </div>
    </BackofficeDialog>
  );
}

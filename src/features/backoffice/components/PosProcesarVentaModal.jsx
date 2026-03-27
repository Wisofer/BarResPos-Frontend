import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../utils/currency.js";

/**
 * Modal tipo "Procesar venta": totales, efectivo recibido, vuelto, método de pago.
 */
export function PosProcesarVentaModal({
  open,
  onClose,
  mesaLabel,
  currencySymbol = "C$",
  lines = [],
  /** Total desde backend (preferido) */
  totalOrdenBackend,
  busy = false,
  onGuardar,
}) {
  const [descuento, setDescuento] = useState("");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [tipoPago, setTipoPago] = useState("Efectivo");
  const [moneda, setMoneda] = useState("C$");
  const [comentario, setComentario] = useState("");

  const subtotalLineas = useMemo(
    () => lines.reduce((s, x) => s + Number(x.lineTotal ?? (x.price || 0) * (x.qty || 0)), 0),
    [lines]
  );

  const descuentoNum = Math.max(0, Number(descuento) || 0);

  const totalDesdeBackend =
    totalOrdenBackend != null && Number.isFinite(Number(totalOrdenBackend)) ? Number(totalOrdenBackend) : null;
  /** Base imponible: preferimos total del sistema si existe; si no, suma de líneas. Luego restamos descuento. */
  const baseAntesDescuento =
    totalDesdeBackend != null && totalDesdeBackend > 0 ? totalDesdeBackend : subtotalLineas;
  const totalAPagar = Math.max(0, baseAntesDescuento - descuentoNum);

  const recibidoNum = Number(montoRecibido) || 0;
  const vuelto = tipoPago === "Efectivo" ? Math.max(0, recibidoNum - totalAPagar) : 0;

  useEffect(() => {
    if (!open) return;
    setDescuento("");
    setComentario("");
    setTipoPago("Efectivo");
    setMoneda("C$");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMontoRecibido(String(totalAPagar.toFixed(2)));
  }, [open, totalAPagar]);

  useEffect(() => {
    if (tipoPago !== "Efectivo") {
      setMontoRecibido(String(totalAPagar.toFixed(2)));
    }
  }, [tipoPago, totalAPagar, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tipoPago === "Efectivo" && recibidoNum + 1e-6 < totalAPagar) {
      return;
    }
    onGuardar?.({
      descuento: descuentoNum,
      subtotalLineas,
      totalAPagar,
      montoRecibido: recibidoNum,
      vuelto,
      tipoPago,
      moneda,
      comentario: comentario.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} disabled={busy} />
      <form
        onSubmit={handleSubmit}
        className="relative z-[201] flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">Procesar venta</h2>
          <p className="text-xs text-slate-500">{mesaLabel}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Cant.</th>
                  <th className="px-2 py-2 text-right">P.U</th>
                  <th className="px-2 py-2 text-right">P.T</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => {
                  const pt = Number(row.lineTotal ?? (row.price || 0) * (row.qty || 0));
                  return (
                    <tr key={`${row.id}-${i}`} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 text-slate-800">{row.name}</td>
                      <td className="px-2 py-1.5">{row.qty}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(row.price, currencySymbol)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(pt, currencySymbol)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-1 text-right text-sm text-slate-700">
            <div className="flex justify-between gap-2">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalLineas, currencySymbol)}</span>
            </div>
            <label className="flex items-center justify-between gap-2 text-left">
              <span className="text-xs font-medium text-slate-600">Total descuento</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                disabled={busy}
              />
            </label>
            {totalDesdeBackend != null && totalDesdeBackend > 0 && Math.abs(totalDesdeBackend - subtotalLineas) > 0.01 && (
              <p className="text-[11px] text-amber-700">Total en sistema: {formatCurrency(totalDesdeBackend, currencySymbol)} (líneas: {formatCurrency(subtotalLineas, currencySymbol)})</p>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
              <span>Total a pagar</span>
              <span>{formatCurrency(totalAPagar, currencySymbol)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Total efectivo (recibido)
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                disabled={busy || tipoPago !== "Efectivo"}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Vuelto
              <input readOnly value={vuelto.toFixed(2)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-800" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Método de pago
              <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" disabled={busy}>
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
                <option>Mixto</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Moneda
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" disabled={busy}>
                <option value="C$">Córdobas (C$)</option>
                <option value="$">Dólares ($)</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Comentario
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-2 py-2 text-sm"
                disabled={busy}
              />
            </label>
          </div>

          {tipoPago === "Efectivo" && recibidoNum + 1e-6 < totalAPagar && (
            <p className="mt-2 text-xs font-medium text-red-600">El efectivo recibido debe ser mayor o igual al total a pagar.</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || (tipoPago === "Efectivo" && recibidoNum + 1e-6 < totalAPagar)}
            className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

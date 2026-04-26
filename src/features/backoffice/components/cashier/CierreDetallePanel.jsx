import React from "react";
import { X } from "lucide-react";
import { formatCurrency } from "../../utils/currency.js";
import {
  cierreDetalleDiferencia,
  cierreDetalleFechaDisplay,
  cierreDetalleMediosPago,
  cierreDetalleMontoEsperado,
  cierreDetalleMontoInicial,
  cierreDetalleMontoRealNullable,
  cierreDetalleTexto,
  cierreDetalleTotalGeneral,
  diffAmountTextClass,
} from "../../utils/caja.js";

export function CierreDetallePanel({ detalle, currencySymbol = "C$", onClose }) {
  const diffVal = cierreDetalleDiferencia(detalle);
  const diffColor = diffAmountTextClass(diffVal);
  const { efectivo: efectivoDet, tarjeta: tarjetaDet, transferencia: transferDet } = cierreDetalleMediosPago(detalle);
  const usuarioTxt = cierreDetalleTexto(detalle, ["usuario", "Usuario"]);
  const observacionesTxt = cierreDetalleTexto(detalle, ["observaciones", "Observaciones"]);

  const summaryCards = [
    { label: "Apertura (fondo)", value: cierreDetalleMontoInicial(detalle), color: "text-slate-900", bg: "bg-slate-50", border: "border-slate-200", optional: false },
    { label: "Ventas totales", value: cierreDetalleTotalGeneral(detalle), color: "text-blue-700", bg: "bg-blue-50/80", border: "border-blue-100", optional: false },
    { label: "Monto esperado en caja", value: cierreDetalleMontoEsperado(detalle), color: "text-slate-900", bg: "bg-slate-50", border: "border-slate-200", optional: false },
    { label: "Monto contado (real)", value: cierreDetalleMontoRealNullable(detalle), color: "text-primary-700", bg: "bg-primary-50", border: "border-primary-200", optional: true },
    { label: "Diferencia (sobrante / faltante)", value: diffVal, color: diffColor, bg: "bg-amber-50/80", border: "border-amber-100", optional: true },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Detalle del cierre</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cierre #{detalle.id ?? detalle.Id ?? "—"} · {cierreDetalleFechaDisplay(detalle)}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Cerrar
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((d, i) => (
          <div key={i} className={`rounded-xl border p-4 ${d.bg} ${d.border}`}>
            <p className="text-xs font-medium text-slate-500">{d.label}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${d.color}`}>
              {d.optional && (d.value == null || !Number.isFinite(Number(d.value)))
                ? "—"
                : formatCurrency(d.value ?? 0, currencySymbol)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Efectivo (ventas)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {efectivoDet != null ? formatCurrency(efectivoDet, currencySymbol) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Tarjeta</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {tarjetaDet != null ? formatCurrency(tarjetaDet, currencySymbol) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Transferencia</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {transferDet != null ? formatCurrency(transferDet, currencySymbol) : "—"}
          </p>
        </div>
      </div>

      {(observacionesTxt || usuarioTxt) && (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
          {usuarioTxt ? (
            <p>
              <span className="font-medium text-slate-600">Usuario: </span>
              <span className="text-slate-900">{usuarioTxt}</span>
            </p>
          ) : null}
          {observacionesTxt ? (
            <p>
              <span className="font-medium text-slate-600">Observaciones: </span>
              <span className="text-slate-800">{observacionesTxt}</span>
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}

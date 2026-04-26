import React from "react";
import { formatCurrency } from "../../utils/currency.js";

export function CashierSummary({
  totalVentas,
  totalOrdenes,
  totalEfectivo,
  totalTarjeta,
  totalTransferencia,
  montoEsperadoCalculado,
  montoInicialActual,
  currencySymbol,
}) {
  const efectivo = Number(totalEfectivo || 0);
  const tarjeta = Number(totalTarjeta || 0);
  const transf = Number(totalTransferencia || 0);
  const ventas = Number(totalVentas || 0);
  const ordenes = Number(totalOrdenes || 0);
  const tarjetaMasTransf = tarjeta + transf;
  const fondo = Number(montoInicialActual || 0);

  const cells = [
    { label: "Ventas (neto)", value: ventas, currency: true },
    { label: "Tickets", value: ordenes, currency: false },
    { label: "Efectivo", value: efectivo, currency: true },
    { label: "Tarjeta + transf.", value: tarjetaMasTransf, currency: true },
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Resumen del día</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-slate-500">{cell.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {cell.currency ? formatCurrency(cell.value, currencySymbol) : cell.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 shadow-sm">
        <p className="text-xs font-medium text-amber-900">Monto esperado en caja (efectivo)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-950">
          {formatCurrency(montoEsperadoCalculado, currencySymbol)}
        </p>
        {fondo > 0 ? (
          <p className="mt-1 text-xs text-amber-800/90">Incluye fondo inicial {formatCurrency(fondo, currencySymbol)}</p>
        ) : null}
      </div>
    </article>
  );
}

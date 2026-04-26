import { formatCurrency } from "../../utils/currency.js";

/**
 * Tres cifras compactas: cobrado neto, total de pedidos, pagados (mismo criterio que el resumen del API).
 */
export function OrdersKpiGrid({ cards, currencySymbol }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cobrado (neto)</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
          {cards.montoTotalCobradoNeto != null && Number.isFinite(cards.montoTotalCobradoNeto)
            ? formatCurrency(cards.montoTotalCobradoNeto, currencySymbol)
            : "—"}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pedidos</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{cards.totalPedidos}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pagados</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{cards.pagados}</p>
      </div>
    </div>
  );
}

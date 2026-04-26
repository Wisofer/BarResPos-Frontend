import React, { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { formatCurrency } from "../../utils/currency.js";
import { formatDateTime } from "../../utils/reportDates.js";
import { tableHorizontalScrollClass } from "../../utils/modalResponsiveClasses.js";

function rowMonto(r) {
  return Number(r.monto ?? r.Monto ?? 0);
}

export function CashierPendingOrders({ items = [], currencySymbol = "C$" }) {
  const [open, setOpen] = useState(true);
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;

  return (
    <article className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-amber-950">Cobros pendientes</h3>
            <p className="text-xs text-amber-900/80">
              {list.length} {list.length === 1 ? "orden sin cobrar" : "órdenes sin cobrar"} (no pagada / no anulada)
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-5 w-5 shrink-0 text-amber-800" /> : <ChevronDown className="h-5 w-5 shrink-0 text-amber-800" />}
      </button>

      {open ? (
        <div className={`mt-3 ${tableHorizontalScrollClass}`}>
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wide text-amber-900/70">
              <tr>
                <th className="px-2 py-1.5">Documento</th>
                <th className="px-2 py-1.5">Mesa</th>
                <th className="px-2 py-1.5">Cliente</th>
                <th className="px-2 py-1.5">Estado</th>
                <th className="px-2 py-1.5">Monto</th>
                <th className="px-2 py-1.5">Creada</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id ?? r.Id} className="border-t border-amber-200/60 text-amber-950">
                  <td className="px-2 py-2 font-medium tabular-nums">{r.numero ?? r.Numero ?? "—"}</td>
                  <td className="px-2 py-2">{r.mesa ?? r.Mesa ?? "—"}</td>
                  <td className="px-2 py-2">{r.cliente ?? r.Cliente ?? "—"}</td>
                  <td className="px-2 py-2 text-xs">{r.estado ?? r.Estado ?? "—"}</td>
                  <td className="px-2 py-2 font-semibold tabular-nums">{formatCurrency(rowMonto(r), currencySymbol)}</td>
                  <td className="px-2 py-2 text-xs text-amber-900/85">
                    {formatDateTime(r.fechaCreacion ?? r.FechaCreacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}

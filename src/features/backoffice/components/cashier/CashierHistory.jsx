import React from "react";
import { History } from "lucide-react";
import { BackofficeDialog } from "../index.js";
import { formatCurrency } from "../../utils/currency.js";
import { cierreFechaRaw, cierreHistorialMontoPrincipal, cierreId } from "../../utils/caja.js";
import { CierreDetallePanel } from "./CierreDetallePanel.jsx";

export function CashierHistory({
  showHistorial,
  setShowHistorial,
  historial,
  historialPage,
  historialTotalPages,
  loadAll,
  loadDetalleCierre,
  cierreDetalle,
  clearCierreDetalle,
  processing,
  currencySymbol,
}) {
  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <History className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Historial de cierres</h3>
              <p className="text-xs text-slate-500">Arqueos y turnos anteriores.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistorial(!showHistorial)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {showHistorial ? "Ocultar" : "Mostrar historial"}
            </button>
          </div>
        </div>

        {showHistorial && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5">
              <button
                type="button"
                onClick={() => loadAll(Math.max(1, historialPage - 1))}
                disabled={historialPage <= 1 || processing}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600">
                Página {historialPage} de {historialTotalPages}
              </span>
              <button
                type="button"
                onClick={() => loadAll(Math.min(historialTotalPages, historialPage + 1))}
                disabled={historialPage >= historialTotalPages || processing}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>

            {historial.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No hay cierres registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {historial.map((item, i) => {
                  const cid = cierreId(item) ?? i + 1;
                  return (
                    <li
                      key={cid}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 hover:bg-slate-50/80 sm:px-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">Cierre #{cid}</p>
                        <p className="text-xs text-slate-500">
                          {String(cierreFechaRaw(item)).slice(0, 16).replace("T", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(cierreHistorialMontoPrincipal(item), currencySymbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => loadDetalleCierre(cierreId(item))}
                          disabled={cierreId(item) == null || processing}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          Detalle
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </article>

      {cierreDetalle ? (
        <BackofficeDialog maxWidthClass="max-w-2xl" onBackdropClick={() => clearCierreDetalle?.()}>
          <CierreDetallePanel detalle={cierreDetalle} currencySymbol={currencySymbol} onClose={() => clearCierreDetalle?.()} />
        </BackofficeDialog>
      ) : null}
    </>
  );
}

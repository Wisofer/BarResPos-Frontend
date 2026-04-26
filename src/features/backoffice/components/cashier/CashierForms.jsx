import React, { useMemo } from "react";
import { formatCurrency } from "../../utils/currency.js";
import { computeArqueoPreview } from "../../utils/cashierArqueo.js";

export function CashierForms({
  showApertura,
  setShowApertura,
  montoInicial,
  setMontoInicial,
  handleAperturaCaja,
  showCierreForm,
  cierreForm,
  setCierreForm,
  handleCerrarCaja,
  processing,
  currencySymbol,
  montoEsperadoEnCaja = 0,
}) {
  const arqueoPreview = useMemo(
    () => computeArqueoPreview(cierreForm?.montoReal, montoEsperadoEnCaja),
    [cierreForm?.montoReal, montoEsperadoEnCaja],
  );

  if (showApertura) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Apertura de Caja</h2>
            <p className="text-sm font-medium text-slate-500">Registra el monto inicial de la jornada.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowApertura(false)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>
        <form onSubmit={handleAperturaCaja} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Monto inicial ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-2xl font-semibold tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
              required
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-500">Efectivo base (fondo de caja) con el que inicias la jornada.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={processing}
              className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              Iniciar Operaciones
            </button>
            <button
              type="button"
              onClick={() => setShowApertura(false)}
              className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </article>
    );
  }

  if (showCierreForm) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Cierre y arqueo</h3>
        <form onSubmit={handleCerrarCaja} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 px-4 py-2">
              <label className="text-xs font-medium text-slate-600">Efectivo contado</label>
              <input
                type="number"
                step="0.01"
                value={cierreForm.montoReal}
                onChange={(e) => setCierreForm((s) => ({ ...s, montoReal: e.target.value }))}
                placeholder="Contado"
                className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-900 focus:outline-none"
                required
              />
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-2">
              <label className="text-xs font-medium text-slate-600">Observaciones</label>
              <input
                value={cierreForm.observaciones}
                onChange={(e) => setCierreForm((s) => ({ ...s, observaciones: e.target.value }))}
                placeholder="Opcional"
                className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3">
            <p className="text-xs font-medium text-slate-600">
              Monto esperado (según sistema){" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(montoEsperadoEnCaja, currencySymbol)}
              </span>
            </p>
            {arqueoPreview === null ? (
              <p className="mt-2 text-xs text-slate-500">Ingresa un monto válido para ver la diferencia.</p>
            ) : arqueoPreview.kind === "empty" ? (
              <p className="mt-2 text-xs text-slate-500">
                Al escribir el efectivo contado verás si falta, sobra o cuadra respecto al esperado.
              </p>
            ) : arqueoPreview.kind === "cuadra" ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{arqueoPreview.label}</p>
                <p className="mt-0.5 text-sm text-emerald-900">{arqueoPreview.detail}</p>
              </div>
            ) : arqueoPreview.kind === "sobra" ? (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-800">{arqueoPreview.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-green-900">
                  +{formatCurrency(arqueoPreview.diff, currencySymbol)}
                </p>
                <p className="mt-1 text-xs text-green-800/95">{arqueoPreview.detail}</p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800">{arqueoPreview.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-red-900">
                  {formatCurrency(arqueoPreview.diff, currencySymbol)}
                </p>
                <p className="mt-1 text-xs text-red-800/95">{arqueoPreview.detail}</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:w-auto"
          >
            Finalizar Turno
          </button>
        </form>
      </article>
    );
  }

  return null;
}

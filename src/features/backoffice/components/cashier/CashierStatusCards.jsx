import React from "react";

export function CashierStatusCards({
  cajaAbierta,
  showApertura,
  setShowApertura,
  showCierreForm,
  setShowCierreForm,
}) {
  if (!cajaAbierta && !showApertura) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <span>●</span>
          Estado actual
        </div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">🔒</div>
        <h2 className="text-2xl font-bold text-slate-900">Caja Cerrada</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          La caja está lista para iniciar. Abre caja para comenzar operaciones del día y habilitar cobros.
        </p>
        <div className="mx-auto mt-5 h-px w-24 bg-slate-200" />
        <button
          type="button"
          onClick={() => setShowApertura(true)}
          className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Abrir Caja
        </button>
      </article>
    );
  }

  if (cajaAbierta) {
    return (
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Caja Abierta</h2>
            <p className="text-sm text-emerald-800">Operando correctamente para este día.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCierreForm(!showCierreForm)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              showCierreForm ? "bg-slate-700 hover:bg-slate-800" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {showCierreForm ? "Ocultar cierre" : "Cerrar caja"}
          </button>
        </div>
      </article>
    );
  }

  return null;
}

export function TablesMesasStatsBar({
  total,
  libres,
  ocupadas,
  reservadas,
  cajaAbierta,
  onUbicaciones,
  onNuevaMesa,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Total: {total}</span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Libres: {libres}</span>
        <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/80">
          Ocupadas: {ocupadas}
        </span>
        <span className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-violet-800/80">
          Reservadas: {reservadas}
        </span>
        <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cajaAbierta ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
          Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUbicaciones}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Ubicaciones
        </button>
        <button
          type="button"
          onClick={onNuevaMesa}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Nueva mesa
        </button>
      </div>
    </div>
  );
}

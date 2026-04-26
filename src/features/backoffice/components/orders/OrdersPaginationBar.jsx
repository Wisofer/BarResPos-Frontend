/**
 * Pie del listado: total de registros y paginación solo si hay más de una página.
 */
export function OrdersPaginationBar({ page, setPage, pageInfo, disabled }) {
  const totalItems = Number(pageInfo?.totalItems ?? 0);
  const rawTotalPages = Number(pageInfo?.totalPages ?? 1);
  const totalPages = Math.max(1, rawTotalPages || 1);
  const showPageNav = totalItems > 0 && totalPages > 1;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-xs text-slate-500">
        Total <span className="font-medium text-slate-700 tabular-nums">{totalItems}</span> registro{totalItems === 1 ? "" : "s"}
        {showPageNav ? (
          <span className="ml-1 text-slate-400">
            · Página {page} de {totalPages}
          </span>
        ) : null}
      </p>
      {showPageNav && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:shrink-0">
          <button
            type="button"
            disabled={page <= 1 || disabled}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="min-w-[5.5rem] px-1 text-center text-sm tabular-nums text-slate-600" aria-hidden>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || disabled}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

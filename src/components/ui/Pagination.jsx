import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Paginación reutilizable.
 * @param {number} page - Página actual (1-based)
 * @param {number} totalPages - Total de páginas
 * @param {number} totalCount - Total de ítems
 * @param {number} pageSize - Ítems por página
 * @param {(page: number) => void} onPageChange - Se llama con el nuevo número de página
 * @param {string} [className] - Clases adicionales
 */
export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  className,
}) {
  if (totalPages <= 1 && totalCount <= pageSize) return null;

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300",
        className
      )}
    >
      <span className="shrink-0">
        {totalCount === 0
          ? "Sin resultados"
          : `Mostrando ${from}-${to} de ${totalCount}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[6rem] text-center font-medium tabular-nums">
          Página {page} de {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

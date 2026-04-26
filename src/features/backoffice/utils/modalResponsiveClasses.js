export const tableHorizontalScrollClass = "w-full overflow-x-auto rounded-xl border border-slate-200";

/** Patrón unificado: formularios en BackofficeDialog (móvil + teclado). */
export const modalFormRootClass = "flex w-full min-w-0 flex-col";

export const modalFormBodyScrollClass =
  "mt-4 min-h-0 max-h-[min(65dvh,520px)] flex-1 space-y-3 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pb-1 sm:max-h-[min(75vh,560px)]";

/** Cuerpo con scroll sin `space-y` (formularios en grid). */
export const modalFormBodyScrollPlainClass =
  "mt-4 min-h-0 max-h-[min(65dvh,520px)] flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pb-1 sm:max-h-[min(75vh,560px)]";

export const modalFormFooterClass =
  "mt-4 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end";

export const modalInputTouchClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 focus:border-primary-500 focus:outline-none sm:py-2 sm:text-sm";

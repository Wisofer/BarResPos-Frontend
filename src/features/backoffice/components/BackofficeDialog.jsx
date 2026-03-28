import { cn } from "../../../utils/cn.js";

/**
 * Overlay + panel responsive: en pantallas pequeñas se ancla abajo (sheet),
 * en sm+ queda centrado. Usa dvh y safe-area para móvil y teclado.
 */
export function BackofficeDialog({ children, maxWidthClass = "max-w-lg", className, panelClassName, onBackdropClick }) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 items-end justify-center overflow-y-auto overscroll-y-contain bg-slate-900/45 px-0 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:items-center sm:bg-slate-900/35 sm:p-4 sm:pb-4 sm:pt-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      <div
        className={cn(
          "relative mb-0 w-full max-h-[min(88dvh,92vh)] overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:mb-auto sm:mt-auto sm:max-h-[min(92dvh,94vh)] sm:rounded-2xl sm:border-0 sm:p-5",
          maxWidthClass,
          panelClassName,
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

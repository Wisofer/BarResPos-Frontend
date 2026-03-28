import { cn } from "../../../utils/cn.js";

/**
 * Overlay + panel responsive: en pantallas pequeñas se ancla abajo (sheet),
 * en sm+ queda centrado. Usa dvh y safe-area para móvil y teclado.
 */
export function BackofficeDialog({ children, maxWidthClass = "max-w-lg", className, panelClassName, onBackdropClick }) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-0 items-end justify-center overflow-y-auto overscroll-y-contain bg-slate-900/45 px-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:items-center sm:bg-slate-900/35 sm:p-4 sm:pb-4 sm:pt-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      <div
        className={cn(
          "relative mb-0 w-full touch-manipulation overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-t-2xl border border-slate-200 bg-white py-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] shadow-2xl sm:mb-auto sm:mt-auto sm:max-h-[min(92dvh,94vh)] sm:rounded-2xl sm:border-0 sm:px-5 sm:py-5",
          "max-h-[min(90dvh,calc(100svh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.75rem))]",
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

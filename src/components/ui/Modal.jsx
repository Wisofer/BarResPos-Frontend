import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../utils/cn";

export function Modal({ open, onClose, title, children, size = "md" }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", "2xl": "max-w-3xl", "3xl": "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 items-end justify-center overflow-y-auto overscroll-y-contain p-0 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 mx-auto w-full max-h-[min(88dvh,92vh)] overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[min(90dvh,92vh)] sm:rounded-xl",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60 sm:px-6 sm:py-4">
          <h2 id="modal-title" className="min-w-0 flex-1 text-lg font-semibold text-slate-800 dark:text-slate-100 sm:text-xl">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar" className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="max-h-[min(72dvh,78vh)] overflow-y-auto overscroll-y-contain p-4 sm:max-h-[min(70dvh,75vh)] sm:p-6">{children}</div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          "relative w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <h2 id="modal-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

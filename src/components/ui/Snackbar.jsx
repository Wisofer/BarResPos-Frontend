import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "../../utils/cn";

const VARIANTS = {
  success: {
    className: "bg-white dark:bg-slate-900 border-2 border-emerald-400/80 dark:border-emerald-500/40 text-slate-800 dark:text-slate-100 shadow-xl shadow-emerald-200/40 dark:shadow-none ring-2 ring-emerald-100 dark:ring-emerald-500/20",
    icon: CheckCircle2,
    iconClassName: "text-emerald-500 dark:text-emerald-300",
  },
  error: {
    className: "bg-white dark:bg-slate-900 border-2 border-red-400/80 dark:border-red-500/40 text-slate-800 dark:text-slate-100 shadow-xl shadow-red-200/40 dark:shadow-none ring-2 ring-red-100 dark:ring-red-500/20",
    icon: XCircle,
    iconClassName: "text-red-500 dark:text-red-300",
  },
  info: {
    className: "bg-white dark:bg-slate-900 border-2 border-primary-400/80 dark:border-primary-500/40 text-slate-800 dark:text-slate-100 shadow-xl shadow-primary-200/40 dark:shadow-none ring-2 ring-primary-100 dark:ring-primary-500/20",
    icon: CheckCircle2,
    iconClassName: "text-primary-500 dark:text-primary-300",
  },
};

export function SnackbarItem({ id, message, variant = "success", duration = 4200, onDismiss }) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-[min(440px,calc(100vw-1.5rem))] min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 sm:min-w-[280px] sm:max-w-[440px] sm:gap-4 sm:px-5 sm:py-4 snackbar-item-enter",
        config.className
      )}
    >
      <span className={cn("shrink-0", config.iconClassName)}>
        <Icon className="w-7 h-7" strokeWidth={2} />
      </span>
      <p className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        aria-label="Cerrar"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export function SnackbarStack({ items, onDismiss }) {
  return (
    <div className="fixed inset-x-3 top-4 z-[100] flex flex-col gap-3 pointer-events-none sm:inset-x-auto sm:right-5 sm:left-auto sm:top-5 [&>*]:pointer-events-auto">
      {items.map((item) => (
        <SnackbarItem
          key={item.id}
          id={item.id}
          message={item.message}
          variant={item.variant}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

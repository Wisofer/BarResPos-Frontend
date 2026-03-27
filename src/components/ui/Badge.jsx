import { cn } from "../../utils/cn";

const variants = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  info: "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200",
};

export function Badge({ children, variant = "default", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

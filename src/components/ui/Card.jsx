import { cn } from "../../utils/cn";

export function Card({ children, className = "", padding = true }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-primary-300",
        padding && !className?.includes("p-") && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className = "" }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {action}
    </div>
  );
}

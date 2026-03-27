import { cn } from "../../utils/cn";

export function Input({
  label,
  error,
  className = "",
  id,
  rightSlot,
  ...props
}) {
  const inputId = id || props.name || "input";
  const hasRightSlot = Boolean(rightSlot);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}
      <div className={cn("w-full", hasRightSlot && "relative")}>
        <input
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            hasRightSlot && "pr-11",
            className
          )}
          {...props}
        />
        {hasRightSlot && (
          <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-2 pointer-events-none [&>*]:pointer-events-auto">
            {rightSlot}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

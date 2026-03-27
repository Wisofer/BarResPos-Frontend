import { useMemo } from "react";

/**
 * Simple horizontal bar chart. data = [{ label, value }]. value is numeric.
 */
export function BarChart({ data, maxValue, valueFormat = (v) => v, height = 8, barClassName = "bg-primary-500" }) {
  const max = useMemo(() => maxValue ?? Math.max(...data.map((d) => d.value), 1), [data, maxValue]);

  return (
    <div className="space-y-2">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-10 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">{label}</span>
          <div className="flex-1 h-6 flex items-center gap-2">
            <div
              className={barClassName + " h-full rounded-md transition-all duration-500 min-w-[4px]"}
              style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 w-16 text-right">
              {valueFormat(value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

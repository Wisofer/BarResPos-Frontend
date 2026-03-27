import { useMemo } from "react";

/**
 * Bar chart with both orientations.
 * data = [{ label, value }]. value is numeric.
 */
export function VerticalBarChart({
  data,
  maxValue,
  valueFormat = (v) => String(v),
  barClassName = "bg-primary-500",
  orientation = "horizontal", // default: horizontal (premium UX)
}) {
  const max = useMemo(() => maxValue ?? Math.max(...data.map((d) => d.value), 1), [data, maxValue]);

  if (orientation === "vertical") {
    return (
      <div className="flex items-end justify-between gap-1 h-40">
        {data.map(({ label, value }, i) => (
          <div key={`${label}-${i}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex flex-col justify-end h-32">
              <div
                className={barClassName + " w-full rounded-t transition-all duration-500 min-h-[4px]"}
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                title={valueFormat(value)}
              />
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate w-full text-center">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // horizontal default
  return (
    <div className="flex flex-col gap-3">
      {data.map(({ label, value }, i) => {
        const pct = max > 0 ? (value / max) * 100 : 0;
        const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
        return (
          <div key={`${label}-${i}`} className="group flex items-center gap-3" aria-label={`${label}: ${valueFormat(value)}`}>
            <div className="w-[46px] shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>

            <div className="relative flex-1">
              <div className="h-3 rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden">
                <div
                  className={barClassName + " h-full rounded-full transition-all duration-500 relative"}
                  style={{
                    width: `${Math.max(2, safePct)}%`,
                    backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.25), rgba(255,255,255,0))",
                  }}
                  title={valueFormat(value)}
                >
                  <div className="absolute inset-y-0 left-0 w-2 bg-white/25 opacity-60" />
                </div>
              </div>

              <div className="pointer-events-none absolute -top-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="rounded-lg bg-slate-900 text-white text-[11px] px-2 py-1 shadow-lg whitespace-nowrap">
                  <span className="font-semibold">{label}</span>
                  <span className="text-white/80">: {valueFormat(value)}</span>
                </div>
              </div>
            </div>

            <div className="w-[92px] shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {valueFormat(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

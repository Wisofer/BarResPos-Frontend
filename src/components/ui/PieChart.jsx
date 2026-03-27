import { useMemo } from "react";

const DEFAULT_COLORS = [
  "var(--color-primary-500, #3b82f6)",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#ef4444",
];

/**
 * Gráfico de pastel. data = [{ label, value }]. value numérico.
 * Muestra proporción de cada elemento con leyenda.
 */
export function PieChart({
  data,
  size = 200,
  strokeWidth = 2,
  colors = DEFAULT_COLORS,
  valueFormat = (v) => String(v),
  className = "",
}) {
  const total = useMemo(() => data.reduce((acc, d) => acc + (d.value || 0), 0), [data]);

  const segments = useMemo(() => {
    if (total <= 0) return [];
    let currentAngle = -90;
    return data
      .filter((d) => d.value > 0)
      .map((d, i) => {
        const angle = (d.value / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return {
          label: d.label,
          value: d.value,
          startAngle,
          angle,
          color: colors[i % colors.length],
        };
      });
  }, [data, total, colors]);

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const describeArc = (startAngle, angle) => {
    if (angle >= 359.99) {
      return ["M", cx, cy - radius, "A", radius, radius, 0, 1, 1, cx, cy + radius, "A", radius, radius, 0, 1, 1, cx, cy - radius, "Z"].join(" ");
    }
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle + angle);
    const largeArc = angle > 180 ? 1 : 0;
    return ["M", cx, cy, "L", start.x, start.y, "A", radius, radius, 0, largeArc, 1, end.x, end.y, "Z"].join(" ");
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0 relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="overflow-visible">
            {segments.length === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="currentColor"
                className="text-slate-200 dark:text-slate-700"
              />
            ) : (
              segments.map((seg, i) => (
                <path
                  key={i}
                  d={describeArc(seg.startAngle, seg.angle)}
                  fill={seg.color}
                  stroke="white"
                  strokeWidth={strokeWidth}
                  className="dark:stroke-slate-900 transition-opacity hover:opacity-90"
                />
              ))
            )}
          </svg>
        </div>
        {segments.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center sm:justify-start min-w-0">
            {segments.map((seg, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden
                />
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={seg.label}>
                  {seg.label}
                </span>
                <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {valueFormat(seg.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg % 360) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

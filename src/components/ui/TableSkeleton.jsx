import { SkeletonTheme } from "react-loading-skeleton";
import Skeleton from "react-loading-skeleton";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "./Table.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";

const lightTheme = {
  baseColor: "#e2e8f0",
  highlightColor: "#f1f5f9",
};

const darkTheme = {
  baseColor: "#334155",
  highlightColor: "#475569",
};

/**
 * Tabla con filas de skeleton. columns = número de celdas por fila, rows = número de filas.
 */
export function TableSkeleton({ columns = 5, rows = 6, theme }) {
  const { settings } = useSettings();
  const skeletonTheme = theme ?? (settings?.theme === "dark" ? darkTheme : lightTheme);
  return (
    <SkeletonTheme baseColor={skeletonTheme.baseColor} highlightColor={skeletonTheme.highlightColor}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHeaderCell key={i}>
                <Skeleton width={i === 0 ? 48 : 72} height={16} />
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton
                    width={colIndex === 0 ? 40 : colIndex === columns - 1 ? 64 : 96}
                    height={20}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SkeletonTheme>
  );
}

/**
 * Lista tipo “cards” (para Ventas): varias líneas con título + subtítulo + monto.
 */
export function CardListSkeleton({ items = 5 }) {
  const { settings } = useSettings();
  const skeletonTheme = settings?.theme === "dark" ? darkTheme : lightTheme;
  return (
    <SkeletonTheme baseColor={skeletonTheme.baseColor} highlightColor={skeletonTheme.highlightColor}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: items }).map((_, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:flex-nowrap">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton width={180} height={20} />
              <div className="flex gap-3">
                <Skeleton width={120} height={16} />
                <Skeleton width={80} height={16} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton width={72} height={24} />
              <Skeleton width={70} height={24} borderRadius={9999} />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonTheme>
  );
}

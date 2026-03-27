import { cn } from "../../utils/cn";

export function Table({ children, className = "" }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className={cn("w-full text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = "" }) {
  return <thead className={cn("bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700", className)}>{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>;
}

export function TableRow({ children, className = "" }) {
  return <tr className={cn("hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors", className)}>{children}</tr>;
}

export function TableHeaderCell({ children, className = "" }) {
  return (
    <th className={cn("px-4 py-3 font-medium text-slate-600 dark:text-slate-300", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "" }) {
  return <td className={cn("px-4 py-3 text-slate-700 dark:text-slate-200", className)}>{children}</td>;
}

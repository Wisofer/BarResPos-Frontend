function pulse(className) {
  return `animate-pulse rounded-lg bg-slate-200/80 ${className}`;
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={pulse("h-4 w-28")} />
          <div className={pulse("mt-3 h-8 w-24")} />
          <div className={pulse("mt-2 h-3 w-32")} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={pulse("mb-4 h-6 w-40")} />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <div className={pulse("h-4 w-44")} />
            <div className={pulse("mt-2 h-3 w-64")} />
          </div>
        ))}
      </div>
    </div>
  );
}

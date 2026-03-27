import { cn } from "../../utils/cn";

export function Loader({ className = "" }) {
  return (
    <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
      </div>
    </div>
  );
}

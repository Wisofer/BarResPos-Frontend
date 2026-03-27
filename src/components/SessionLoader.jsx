import { Plane } from "lucide-react";

export function SessionLoader({ message = "Cargando..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg">
          <Plane className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
        </div>
      </div>
    </div>
  );
}

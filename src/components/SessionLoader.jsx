import { APP_NAME } from "../config/brand.js";

export function SessionLoader({ message = "Cargando..." }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100">
      <div className="relative w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary-100 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-emerald-100 blur-2xl" />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img src="/assets/images/logo.png" alt={`${APP_NAME} logo`} className="h-10 w-10 object-contain" />
        </div>
        <p className="relative mt-4 text-sm font-semibold text-slate-800">{APP_NAME}</p>
        <p className="relative mt-1 text-xs text-slate-500">{message}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-[loader-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary-500" />
        </div>
      </div>
    </div>
  );
}

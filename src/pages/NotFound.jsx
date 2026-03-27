import { Link } from "react-router-dom";
import { APP_NAME } from "../config/brand.js";

export function NotFound() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto mt-12 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-800">Ruta no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          La página que intentas abrir no existe o fue movida en {APP_NAME}.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/app"
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Ir al panel
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ir a login
          </Link>
        </div>
      </section>
    </main>
  );
}

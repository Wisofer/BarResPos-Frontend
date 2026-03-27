import { LogOut, Menu, X } from "lucide-react";
import { APP_NAME } from "../../../config/brand.js";
import { NAV_ITEMS } from "../constants.js";

const QUICK_NAV_IDS = ["dashboard", "tables", "kitchen", "cashier"];

export function MobileNav({ open, setOpen, activeView, onChangeView, onLogout, sessionLoading }) {
  const quickNavItems = NAV_ITEMS.filter((item) => QUICK_NAV_IDS.includes(item.id));

  return (
    <>
      <header className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <img src="/assets/images/logo.png" alt={`${APP_NAME} logo`} className="h-9 w-9 rounded-lg object-contain" />
          <div>
            <p className="text-sm font-bold text-slate-800">{APP_NAME}</p>
            <p className="text-[11px] text-slate-500">Panel administrativo</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/35 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed left-3 top-3 z-50 h-[calc(100vh-1.5rem)] w-[82%] max-w-[320px] rounded-3xl border border-slate-200 bg-white p-5 shadow-xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/assets/images/logo.png" alt={`${APP_NAME} logo`} className="h-11 w-11 rounded-xl object-contain" />
              <div>
                <p className="text-lg font-bold text-slate-800">{APP_NAME}</p>
                <p className="text-xs text-slate-500">Panel administrativo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="mt-8 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  activeView === item.id
                    ? "bg-primary-50 font-semibold text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            disabled={sessionLoading}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {sessionLoading ? "Cerrando..." : "Cerrar sesion"}
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
        <ul className="grid grid-cols-4 gap-1">
          {quickNavItems.map((item) => {
            const active = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChangeView(item.id)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium ${
                    active ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { APP_NAME } from "../../../config/brand.js";
import { NAV_ITEMS } from "../constants.js";

export function SidebarNav({
  collapsed,
  activeView,
  onChangeView,
  onToggle,
  onLogout,
  sessionLoading,
  navItems = NAV_ITEMS,
}) {
  return (
    <aside className="hidden h-full min-h-0 w-full min-w-0 max-w-full overflow-x-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <div
        className={`flex min-w-0 items-center gap-2 sm:gap-3 ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <img
          src="/assets/images/nandofood.png"
          alt={`${APP_NAME} logo`}
          className="h-10 w-10 shrink-0 rounded-xl object-contain sm:h-11 sm:w-11"
        />
        <div className={`min-w-0 flex-1 ${collapsed ? "hidden" : "block"}`}>
          <p className="truncate text-base font-bold leading-tight text-slate-800 sm:text-lg" title={APP_NAME}>
            {APP_NAME}
          </p>
          <p className="truncate text-xs text-slate-500">Panel administrativo</p>
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Contraer menú lateral"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="mt-6 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden sm:mt-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex w-full min-w-0 max-w-full items-center rounded-xl px-2 py-2 text-sm sm:px-3 ${
              activeView === item.id ? "bg-primary-50 font-semibold text-primary-700" : "text-slate-600 hover:bg-slate-100"
            } ${collapsed ? "justify-center" : "gap-2 sm:gap-3"}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className={`min-w-0 truncate text-left ${collapsed ? "hidden" : "inline"}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        disabled={sessionLoading}
        className={`mt-4 flex w-full min-w-0 max-w-full shrink-0 items-center rounded-xl border border-slate-200 px-2 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 sm:mt-6 sm:px-4 ${
          collapsed ? "justify-center" : "justify-start gap-2"
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className={`min-w-0 truncate text-left ${collapsed ? "hidden" : "inline"}`}>
          {sessionLoading ? "Cerrando..." : "Cerrar sesión"}
        </span>
      </button>
    </aside>
  );
}

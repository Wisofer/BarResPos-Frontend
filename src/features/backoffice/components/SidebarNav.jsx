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
    <aside className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3`}>
        <img src="/assets/images/logo.png" alt={`${APP_NAME} logo`} className="h-11 w-11 rounded-xl object-contain" />
        <div className={collapsed ? "hidden" : "block"}>
          <p className="text-lg font-bold text-slate-800">{APP_NAME}</p>
          <p className="text-xs text-slate-500">Panel administrativo</p>
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
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

      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-sm ${
              activeView === item.id ? "bg-primary-50 font-semibold text-primary-700" : "text-slate-600 hover:bg-slate-100"
            } ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <item.icon className="h-4 w-4" />
            <span className={collapsed ? "hidden" : "inline"}>{item.label}</span>
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        disabled={sessionLoading}
        className={`mt-auto flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 ${
          collapsed ? "" : "gap-2"
        }`}
      >
        <LogOut className="h-4 w-4" />
        <span className={collapsed ? "hidden" : "inline"}>{sessionLoading ? "Cerrando..." : "Cerrar sesion"}</span>
      </button>
    </aside>
  );
}

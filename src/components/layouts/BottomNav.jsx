import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Menu } from "lucide-react";
import { cn } from "../../utils/cn";

const tabs = [
  { to: "/", icon: LayoutDashboard, label: "Inicio" },
  { to: "/inventario", icon: Package, label: "Inventario" },
  { to: "/ventas", icon: ShoppingCart, label: "Ventas" },
  { to: "/clientes", icon: Users, label: "Clientes" },
];

export function BottomNav({ onMenuClick }) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "border-t border-slate-200 dark:border-slate-800",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur",
        "safe-area-inset-bottom",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Navegación principal"
    >
      <div className="flex h-16 items-center justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full py-2 transition-colors",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium truncate max-w-full px-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label="Más opciones"
        >
          <Menu className="h-6 w-6 shrink-0" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
}

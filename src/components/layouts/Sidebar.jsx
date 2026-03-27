import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Settings,
  LogOut,
  ArrowDownCircle,
  Wrench,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { APP_NAME } from "../../config/brand.js";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../hooks/useSettings";

const menuItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/inventario", icon: Package, label: "Inventario" },
  { to: "/ventas", icon: ShoppingCart, label: "Ventas" },
  { to: "/servicios", icon: Wrench, label: "Servicios" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/historial", icon: History, label: "Historial" },
  { to: "/egresos", icon: ArrowDownCircle, label: "Egresos" },
  { to: "/reports", icon: BarChart3, label: "Reportes" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

export function Sidebar({ open = true, collapsed = false, onNavigate }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const companyName = settings?.companyName?.trim() || APP_NAME;

  const isAdmin = user?.rol === "Administrador";
  const visibleMenuItems = isAdmin
    ? menuItems
    : menuItems.filter(({ to }) =>
        ["/", "/inventario", "/ventas", "/servicios", "/clientes", "/historial", "/egresos", "/reports"].includes(to)
      );

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate("/login", { replace: true });
  };

  const userName = user?.nombreCompleto || user?.usuario || "Usuario";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-[width] duration-200",
        "w-64 lg:translate-x-0",
        collapsed && "lg:w-20",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 px-3",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center min-w-0 flex-1">
              <img
                src="/assets/images/logo.png"
                alt={companyName}
                className="h-10 w-auto max-w-full object-contain object-left"
              />
            </div>
          ) : (
            <img
              src="/assets/images/logo.png"
              alt={companyName}
              title={companyName}
              className="h-10 w-10 object-contain object-center"
            />
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-x-hidden p-3">
          {visibleMenuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate flex-1">{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div
          className={cn(
            "shrink-0 border-t border-slate-200 dark:border-slate-800 p-3",
            collapsed ? "flex flex-col items-center gap-2" : "space-y-2"
          )}
        >
          {!collapsed && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate px-1" title={userName}>
              {userName}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 w-full transition-colors",
              collapsed && "justify-center px-2 w-auto"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

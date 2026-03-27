import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, PanelLeft, PanelLeftClose, CalendarCheck, FileText, DollarSign, User, LogOut, Sun, Moon } from "lucide-react";
import { useActivity } from "../../hooks/useActivity";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../hooks/useSettings";
import { formatDateTime } from "../../utils/format";
import { APP_NAME } from "../../config/brand.js";

const typeIcons = {
  reservation: CalendarCheck,
  invoice: FileText,
  payment: DollarSign,
  client: User,
  sale: DollarSign,
  product: FileText,
  inventory: FileText,
};

export function Navbar({ onMenuClick, collapsed = false, onToggleCollapse }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { activity } = useActivity(15);
  const { user, logout } = useAuth();
  const { settings, update } = useSettings();
  const isDark = settings?.theme === "dark";
  const companyName = settings?.companyName?.trim() || APP_NAME;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={
        "flex h-14 sm:h-16 items-center justify-between border-b border-primary-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:dark:bg-slate-900/70 shadow-sm px-3 sm:px-6 " +
        "fixed top-0 left-0 right-0 z-40 lg:z-30 lg:sticky lg:top-0 lg:relative"
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-initial lg:gap-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-200 active:scale-95 transition lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 justify-center lg:hidden">
          <span className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
            {companyName}
          </span>
        </div>
      </div>
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      )}
      <div className="hidden lg:block flex-1" aria-hidden />
      <div className="flex items-center gap-0.5 sm:gap-1" ref={notifRef}>
        <button
          type="button"
          onClick={() => update({ theme: isDark ? "light" : "dark" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
          aria-label={isDark ? "Usar tema claro" : "Usar tema oscuro"}
          title={isDark ? "Tema claro" : "Tema oscuro"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-700 dark:hover:text-primary-200 transition-colors relative"
            aria-label="Notificaciones"
            aria-expanded={notifOpen}
          >
            <Bell className="h-5 w-5" />
            {activity.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 max-h-[min(24rem,70vh)] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activity.length} recientes</p>
              </div>
              <div className="overflow-y-auto">
                {activity.map((a, idx) => {
                  const Icon = typeIcons[a.type] || FileText;
                  return (
                    <div
                      key={a.id ?? idx}
                      className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 dark:bg-slate-800 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2">{a.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDateTime(a.time)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-slate-800 border-2 border-primary-200 dark:border-slate-700 hover:bg-primary-200/80 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-300"
            aria-label="Ver información del usuario"
            aria-expanded={userMenuOpen}
          >
            <span className="text-sm font-medium text-primary-700">
              {(user?.nombreCompleto || user?.usuario || "A").charAt(0).toUpperCase()}
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.nombreCompleto || "Usuario"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">@{user?.usuario || "—"}</p>
                <p className="text-xs text-primary-600 mt-1">{user?.rol || "—"}</p>
                {user?.estado && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Estado: {user.estado}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

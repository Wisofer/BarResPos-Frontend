import { useEffect, useRef, useState } from "react";
import { Bell, Package, UserCircle } from "lucide-react";
import { displayUserName } from "../../../utils/authUser.js";
import { cn } from "../../../utils/cn.js";

/**
 * Campana + perfil con paneles. `variant="topbar"` para la franja móvil; `card` para el header de vista en desktop.
 */
export function BackofficeShellHeaderActions({
  user,
  logout,
  sessionLoading,
  lowStockItems,
  refreshLowStock,
  openView,
  allowedViewIds,
  variant = "card",
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const rootRef = useRef(null);
  const lowStockCount = lowStockItems.length;

  useEffect(() => {
    const onPointerDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setNotifOpen(false);
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  const isTopbar = variant === "topbar";
  const btnBase =
    "relative inline-flex shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white";
  const btnSize = "h-11 w-11 min-h-[44px] min-w-[44px]";

  const panelClass =
    "z-[100] max-h-[min(24rem,75dvh)] w-[min(22rem,calc(100vw-1.25rem))] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40";

  return (
    <div ref={rootRef} className={cn("flex shrink-0 items-center gap-0.5 sm:gap-1", isTopbar && "touch-manipulation")}>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen((o) => !o);
            setProfileOpen(false);
            void refreshLowStock();
          }}
          className={cn(btnBase, btnSize, "touch-manipulation")}
          aria-label="Notificaciones"
          aria-expanded={notifOpen}
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {lowStockCount > 0 && (
            <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
              {lowStockCount > 9 ? "9+" : lowStockCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            className={cn(
              "absolute max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[4.25rem] sm:right-0 sm:top-[calc(100%+0.35rem)]",
              panelClass
            )}
            role="dialog"
            aria-label="Notificaciones"
          >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Notificaciones</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {lowStockCount === 0
                  ? "Sin alertas de inventario"
                  : `${lowStockCount} ${lowStockCount === 1 ? "alerta" : "alertas"} de stock bajo`}
              </p>
            </div>
            <div className="max-h-60 overflow-y-auto py-2 sm:max-h-72">
              {lowStockCount === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Todo en orden por ahora.</p>
              ) : (
                <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                  {lowStockItems.map((p, idx) => (
                    <li
                      key={p.id != null ? String(p.id) : `stock-${idx}-${p.nombre}`}
                      className="flex gap-3 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                        <Package className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{p.nombre}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Stock bajo · {p.stock} / {p.stockMinimo} mín.
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {lowStockCount > 0 && allowedViewIds.includes("products") && (
              <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    openView("products");
                    setNotifOpen(false);
                  }}
                  className="w-full rounded-lg py-2.5 text-center text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40"
                >
                  Ver productos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setProfileOpen((o) => !o);
            setNotifOpen(false);
          }}
          className={cn(btnBase, btnSize, "touch-manipulation")}
          aria-label="Perfil"
          title="Perfil"
          aria-expanded={profileOpen}
        >
          <UserCircle className="h-6 w-6" strokeWidth={1.75} />
        </button>
        {profileOpen && (
          <div
            className={cn(
              "absolute max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[4.25rem] sm:right-0 sm:top-[calc(100%+0.35rem)]",
              "z-[100] w-[min(19rem,calc(100vw-1.25rem))] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
            )}
            role="dialog"
            aria-label="Perfil de usuario"
          >
            <div className="flex gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                aria-hidden
              >
                <UserCircle className="h-9 w-9" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sesión</p>
                <p className="mt-1 truncate text-base font-bold text-slate-900 dark:text-slate-100">{displayUserName(user)}</p>
                {user?.nombreCompleto &&
                  user?.nombreUsuario &&
                  String(user.nombreCompleto).trim() !== String(user.nombreUsuario).trim() && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">@{user.nombreUsuario}</p>
                  )}
                {user?.rol != null && user.rol !== "" && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Rol: <span className="font-medium text-slate-800 dark:text-slate-100">{user.rol}</span>
                  </p>
                )}
                {user?.email != null && user.email !== "" && (
                  <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                )}
                {user?.id != null && <p className="mt-1 text-xs text-slate-400">ID: {user.id}</p>}
              </div>
            </div>
            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  void logout();
                }}
                disabled={sessionLoading}
                className="min-h-11 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {sessionLoading ? "Cerrando…" : "Cerrar sesión"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

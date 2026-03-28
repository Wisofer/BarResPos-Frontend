import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Package, UserCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSnackbar } from "../contexts/SnackbarContext.jsx";
import { MobileNav, SidebarNav } from "../features/backoffice/components";
import { NAV_ITEMS } from "../features/backoffice/constants.js";
import { backofficeApi } from "../features/backoffice/services/backofficeApi.js";
import { resolveCurrencySymbol } from "../features/backoffice/utils/currency.js";
import { canAccessView, getAllowedViewIds } from "../features/backoffice/utils/auth.js";
import { displayUserName } from "../utils/authUser.js";
import {
  CashierView,
  DashboardView,
  KitchenView,
  OrdersView,
  ProductsView,
  ProvidersView,
  ReportsView,
  SettingsView,
  TablesView,
  UsersView,
} from "../features/backoffice/views";

const SIDEBAR_COLLAPSED_KEY = "barrest-sidebar-collapsed";
const TITLES = {
  dashboard: "Dashboard",
  orders: "Gestion de pedidos",
  tables: "Gestion de mesas",
  products: "Gestion de productos",
  providers: "Proveedores",
  kitchen: "Cocina",
  cashier: "Caja",
  users: "Usuarios",
  settings: "Configuraciones",
  reports: "Reportes",
};

/** Lista que envía el resumen del dashboard (varias formas posibles del API). */
function extractDashboardLowStockList(dashboard) {
  if (!dashboard || typeof dashboard !== "object") return [];
  const candidates = [
    dashboard.productosStockBajoLista,
    dashboard.ProductosStockBajoLista,
    dashboard.productos_stock_bajo_lista,
    dashboard.productosStockBajo,
    dashboard.ProductosStockBajo,
    dashboard.kpis?.productosStockBajoLista,
    dashboard.kpis?.ProductosStockBajoLista,
    dashboard.Kpis?.productosStockBajoLista,
    dashboard.Kpis?.ProductosStockBajoLista,
  ];
  for (const v of candidates) {
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

/** Misma regla que en Productos: controlarStock + mínimo > 0 + stock <= mínimo. */
function lowStockFromProductosCatalog(items) {
  const list = Array.isArray(items) ? items : [];
  const out = [];
  for (const p of list) {
    const ctrl = Boolean(p.controlarStock ?? p.ControlarStock);
    const min = Number(p.stockMinimo ?? p.stock_minimo ?? p.StockMinimo ?? 0);
    const stock = Number(p.stock ?? p.Stock ?? 0);
    if (!ctrl || min <= 0 || stock > min) continue;
    out.push({
      id: p.id ?? p.Id,
      nombre: p.nombre ?? p.Nombre ?? "Producto",
      stock,
      stockMinimo: min,
    });
  }
  return out;
}

export function AuthHome() {
  const { user, logout, sessionLoading } = useAuth();
  const snackbar = useSnackbar();
  const lowStockSigRef = useRef(null);
  const notifWrapRef = useRef(null);
  const profileWrapRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [currencySymbol, setCurrencySymbol] = useState("C$");
  const [lowStockItems, setLowStockItems] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const allowedViewIds = useMemo(() => getAllowedViewIds(user), [user]);
  const navItems = useMemo(() => NAV_ITEMS.filter((item) => allowedViewIds.includes(item.id)), [allowedViewIds]);

  const lowStockCount = lowStockItems.length;

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    let mounted = true;
    backofficeApi
      .configuraciones()
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setCurrencySymbol(resolveCurrencySymbol(list));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const openView = (view) => {
    if (!canAccessView(user, view)) return;
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!allowedViewIds.includes(activeView)) {
      setActiveView(allowedViewIds[0] || "dashboard");
    }
  }, [activeView, allowedViewIds]);

  const refreshLowStock = useCallback(async () => {
    try {
      const [dashboard, productosRes] = await Promise.all([
        backofficeApi.dashboardResumen({ topProductos: 3 }),
        backofficeApi.listProductos({ page: 1, pageSize: 500, activos: true }),
      ]);
      let list = extractDashboardLowStockList(dashboard);
      if (list.length === 0) {
        const rawItems = productosRes?.items ?? productosRes?.Items ?? [];
        list = lowStockFromProductosCatalog(rawItems).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
        }));
      } else {
        list = list.map((p) => ({
          id: p.id ?? p.Id,
          nombre: p.nombre ?? p.Nombre ?? "Producto",
          stock: p.stock ?? p.Stock ?? 0,
          stockMinimo: p.stockMinimo ?? p.StockMinimo ?? 0,
        }));
      }
      setLowStockItems(list);
      if (list.length === 0) {
        lowStockSigRef.current = null;
        return;
      }
      const sig = list
        .map((p) => `${p.id}:${p.nombre}:${p.stock}:${p.stockMinimo}`)
        .sort()
        .join("|");
      if (lowStockSigRef.current === sig) return;
      lowStockSigRef.current = sig;
      const count = list.length;
      const preview = list
        .slice(0, 3)
        .map((p) => `${p.nombre} (${p.stock}/${p.stockMinimo})`)
        .join(" · ");
      const suffix = count > 3 ? ` · +${count - 3} más` : "";
      snackbar.info(`Stock bajo: ${count} producto(s) — ${preview}${suffix}`);
    } catch {
      lowStockSigRef.current = null;
      setLowStockItems([]);
    }
  }, [snackbar]);

  useEffect(() => {
    void refreshLowStock();
    const onRefresh = () => void refreshLowStock();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("barrest-inventory-updated", onRefresh);
    const interval = setInterval(onRefresh, 90_000);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("barrest-inventory-updated", onRefresh);
      clearInterval(interval);
    };
  }, [refreshLowStock]);

  useEffect(() => {
    const onPointerDown = (e) => {
      const t = e.target;
      if (notifWrapRef.current?.contains(t)) return;
      if (profileWrapRef.current?.contains(t)) return;
      setNotifOpen(false);
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const ActiveView = useMemo(() => {
    if (activeView === "products") return ProductsView;
    if (activeView === "providers") return ProvidersView;
    if (activeView === "kitchen") return KitchenView;
    if (activeView === "cashier") return CashierView;
    if (activeView === "users") return UsersView;
    if (activeView === "settings") return SettingsView;
    if (activeView === "orders") return OrdersView;
    if (activeView === "tables") return TablesView;
    if (activeView === "reports") return ReportsView;
    return DashboardView;
  }, [activeView]);

  const showViewHeader = true;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <MobileNav
        open={mobileMenuOpen}
        setOpen={setMobileMenuOpen}
        activeView={activeView}
        onChangeView={openView}
        onLogout={logout}
        sessionLoading={sessionLoading}
        navItems={navItems}
      />

      <div
        className={`grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 gap-4 md:min-h-[calc(100vh-3rem)] lg:gap-6 ${
          sidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[260px_1fr]"
        }`}
      >
        <SidebarNav
          collapsed={sidebarCollapsed}
          activeView={activeView}
          onChangeView={openView}
          onToggle={toggleSidebar}
          onLogout={logout}
          sessionLoading={sessionLoading}
          navItems={navItems}
        />

        <section className="space-y-6 pb-24 lg:pb-0 lg:pr-2">
          {showViewHeader && (
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {TITLES[activeView] || `Hola ${displayUserName(user) || "equipo"} 👋`}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">Vista modular con estructura limpia por carpetas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                  <div ref={notifWrapRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen((o) => !o);
                        setProfileOpen(false);
                        void refreshLowStock();
                      }}
                      className="relative rounded-full p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Notificaciones"
                    >
                      <Bell className="h-5 w-5" strokeWidth={1.75} />
                      {lowStockCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                          {lowStockCount > 9 ? "9+" : lowStockCount}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <div
                        className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
                        role="dialog"
                        aria-label="Notificaciones"
                      >
                        <div className="border-b border-slate-100 px-4 py-3">
                          <h2 className="text-base font-bold text-slate-900">Notificaciones</h2>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {lowStockCount === 0
                              ? "Sin alertas de inventario"
                              : `${lowStockCount} ${lowStockCount === 1 ? "alerta" : "alertas"} de stock bajo`}
                          </p>
                        </div>
                        <div className="max-h-72 overflow-y-auto py-2">
                          {lowStockCount === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-slate-500">Todo en orden por ahora.</p>
                          ) : (
                            <ul className="divide-y divide-slate-50">
                              {lowStockItems.map((p, idx) => (
                                <li
                                  key={p.id != null ? String(p.id) : `stock-${idx}-${p.nombre}`}
                                  className="flex gap-3 px-3 py-2.5 transition hover:bg-slate-50"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                    <Package className="h-5 w-5" strokeWidth={1.75} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{p.nombre}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Stock bajo · {p.stock} / {p.stockMinimo} mín.
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {lowStockCount > 0 && allowedViewIds.includes("products") && (
                          <div className="border-t border-slate-100 px-3 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                openView("products");
                                setNotifOpen(false);
                              }}
                              className="w-full rounded-lg py-2 text-center text-sm font-semibold text-primary-600 hover:bg-primary-50"
                            >
                              Ver productos
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div ref={profileWrapRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen((o) => !o);
                        setNotifOpen(false);
                      }}
                      className="rounded-full p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Perfil"
                      title="Perfil"
                    >
                      <UserCircle className="h-6 w-6" strokeWidth={1.75} />
                    </button>
                    {profileOpen && (
                      <div
                        className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(100vw-2rem,19rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
                        role="dialog"
                        aria-label="Perfil de usuario"
                      >
                        <div className="flex gap-3 border-b border-slate-100 p-4">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"
                            aria-hidden
                          >
                            <UserCircle className="h-9 w-9" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sesión</p>
                            <p className="mt-1 truncate text-base font-bold text-slate-900">{displayUserName(user)}</p>
                            {user?.nombreCompleto &&
                              user?.nombreUsuario &&
                              String(user.nombreCompleto).trim() !== String(user.nombreUsuario).trim() && (
                                <p className="mt-0.5 truncate text-xs text-slate-500">@{user.nombreUsuario}</p>
                              )}
                            {user?.rol != null && user.rol !== "" && (
                              <p className="mt-1 text-xs text-slate-600">
                                Rol: <span className="font-medium text-slate-800">{user.rol}</span>
                              </p>
                            )}
                            {user?.email != null && user.email !== "" && (
                              <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
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
                            className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {sessionLoading ? "Cerrando…" : "Cerrar sesión"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
          )}
          <ActiveView currencySymbol={currencySymbol} />
        </section>
      </div>
    </main>
  );
}

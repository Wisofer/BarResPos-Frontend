import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSnackbar } from "../contexts/SnackbarContext.jsx";
import { BackofficeShellHeaderActions, MobileNav, SidebarNav } from "../features/backoffice/components";
import { NAV_ITEMS } from "../features/backoffice/constants.js";
import { backofficeApi } from "../features/backoffice/services/backofficeApi.js";
import { PAGINATION } from "../features/backoffice/constants/pagination.js";
import { DEFAULT_TIPO_CAMBIO_USD, resolveCurrencySymbol } from "../features/backoffice/utils/currency.js";
import { pickPortalTagline } from "../features/backoffice/utils/portalConfig.js";
import { canAccessView, getAllowedViewIds } from "../features/backoffice/utils/auth.js";
import { displayUserName } from "../utils/authUser.js";
import {
  CashierView,
  DashboardView,
  DeliveryView,
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
  delivery: "Delivery",
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [currencySymbol, setCurrencySymbol] = useState("C$");
  const [tipoCambio, setTipoCambio] = useState(DEFAULT_TIPO_CAMBIO_USD);
  const [portalTagline, setPortalTagline] = useState("");
  const [lowStockItems, setLowStockItems] = useState([]);
  const allowedViewIds = useMemo(() => getAllowedViewIds(user), [user]);
  const navItems = useMemo(() => NAV_ITEMS.filter((item) => allowedViewIds.includes(item.id)), [allowedViewIds]);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([backofficeApi.configuraciones(), backofficeApi.configuracionTipoCambio().catch(() => null)])
      .then(([data, tc]) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setCurrencySymbol(resolveCurrencySymbol(list));
        setPortalTagline(pickPortalTagline(list));
        const tcValue = Number(tc?.tipoCambioDolar ?? tc?.TipoCambioDolar ?? tc?.valor ?? 0);
        if (Number.isFinite(tcValue) && tcValue > 0) setTipoCambio(tcValue);
        else setTipoCambio(DEFAULT_TIPO_CAMBIO_USD);
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
        backofficeApi.listProductos({ page: 1, pageSize: PAGINATION.CATALOG_ALERTS, activos: true }),
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

  const ActiveView = useMemo(() => {
    if (activeView === "products") return ProductsView;
    if (activeView === "providers") return ProvidersView;
    if (activeView === "kitchen") return KitchenView;
    if (activeView === "cashier") return CashierView;
    if (activeView === "users") return UsersView;
    if (activeView === "settings") return SettingsView;
    if (activeView === "orders") return OrdersView;
    if (activeView === "tables") return TablesView;
    if (activeView === "delivery") return DeliveryView;
    if (activeView === "reports") return ReportsView;
    return DashboardView;
  }, [activeView]);

  const showViewHeader = true;

  return (
    <main className="min-h-screen min-w-0 bg-slate-100 p-4 md:p-6">
      <MobileNav
        open={mobileMenuOpen}
        setOpen={setMobileMenuOpen}
        activeView={activeView}
        onChangeView={openView}
        onLogout={logout}
        sessionLoading={sessionLoading}
        navItems={navItems}
        topBarEnd={
          <BackofficeShellHeaderActions
            variant="topbar"
            user={user}
            logout={logout}
            sessionLoading={sessionLoading}
            lowStockItems={lowStockItems}
            refreshLowStock={refreshLowStock}
            openView={openView}
            allowedViewIds={allowedViewIds}
          />
        }
      />

      <div
        className={`grid min-h-[calc(100vh-2rem)] w-full min-w-0 grid-cols-1 gap-4 md:min-h-[calc(100vh-3rem)] lg:gap-6 ${
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

        <section className="min-w-0 space-y-6 pb-24 lg:pb-0 lg:pr-2">
          {showViewHeader && (
            <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold leading-tight text-slate-800 sm:text-2xl">
                    {TITLES[activeView] || `Hola ${displayUserName(user) || "equipo"} 👋`}
                  </h1>
                  {portalTagline ? (
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">{portalTagline}</p>
                  ) : null}
                </div>
                <div className="hidden shrink-0 lg:block">
                  <BackofficeShellHeaderActions
                    variant="card"
                    user={user}
                    logout={logout}
                    sessionLoading={sessionLoading}
                    lowStockItems={lowStockItems}
                    refreshLowStock={refreshLowStock}
                    openView={openView}
                    allowedViewIds={allowedViewIds}
                  />
                </div>
              </div>
            </header>
          )}
          <ActiveView currencySymbol={currencySymbol} exchangeRate={tipoCambio} />
        </section>
      </div>
    </main>
  );
}

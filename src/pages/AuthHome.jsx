import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { MobileNav, SidebarNav } from "../features/backoffice/components";
import { backofficeApi } from "../features/backoffice/services/backofficeApi.js";
import { resolveCurrencySymbol } from "../features/backoffice/utils/currency.js";
import {
  CashierView,
  DashboardView,
  KitchenView,
  OrdersView,
  ProductsView,
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
  kitchen: "Cocina",
  cashier: "Caja",
  users: "Usuarios",
  settings: "Configuraciones",
  reports: "Reportes",
};

export function AuthHome() {
  const { user, logout, sessionLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [currencySymbol, setCurrencySymbol] = useState("C$");

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
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const ActiveView = useMemo(() => {
    if (activeView === "products") return ProductsView;
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
        />

        <section className="space-y-6 pb-24 lg:pb-0 lg:pr-2">
          {showViewHeader && (
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{TITLES[activeView] || `Hola ${user?.nombreUsuario || "equipo"} 👋`}</h1>
                  <p className="mt-1 text-sm text-slate-500">Vista modular con estructura limpia por carpetas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    <Search className="h-4 w-4" />
                    Buscar orden o cliente
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    Hoy
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

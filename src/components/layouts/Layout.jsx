import { useEffect, useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { PageLoader } from "../ui/Loader";
import { SessionLoader } from "../SessionLoader";
import { useSidebar } from "../../hooks/useSidebar";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { dashboardApi } from "../../api/dashboard";
import { productsApi } from "../../api/products";
import { cn } from "../../utils/cn";

/**
 * Layout principal: sidebar (colapsable en desktop, menú móvil con overlay en pantallas pequeñas)
 * y área de contenido con Navbar. Responsive: en móvil el menú se abre con el botón hamburguesa
 * y se cierra al navegar o al tocar el overlay.
 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebar();
  const { sessionLoading } = useAuth();
  const { settings } = useSettings();
  const snackbar = useSnackbar();
  const alertsShownRef = useRef(false);
  const lowStockLastCountRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings?.theme === "dark");
  }, [settings?.theme]);

  useEffect(() => {
    if (alertsShownRef.current) return;
    dashboardApi
      .alerts()
      .then((res) => {
        if (res == null) return;
        const hasOverdue = res.message != null;
        const hasUpcoming = res.upcomingTripsMessage != null;
        if (hasOverdue || hasUpcoming) {
          alertsShownRef.current = true;
          if (hasOverdue) snackbar.info(res.message);
          if (hasUpcoming) snackbar.info(res.upcomingTripsMessage);
        }
      })
      .catch(() => {});
  }, [snackbar]);

  useEffect(() => {
    let active = true;
    const fetchLowStock = async () => {
      try {
        const data = await productsApi.lowStock();
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (!active) return;
        const count = list.length;
        const prev = lowStockLastCountRef.current;
        if (count > 0 && (prev == null || prev !== count)) {
          snackbar.info(`Inventario: ${count} producto(s) por reponer.`);
        }
        lowStockLastCountRef.current = count;
      } catch {
        if (active) lowStockLastCountRef.current = 0;
      }
    };

    fetchLowStock();
    const onFocus = () => fetchLowStock();
    const onInventoryUpdated = () => fetchLowStock();
    window.addEventListener("focus", onFocus);
    window.addEventListener("inventory-updated", onInventoryUpdated);
    const interval = setInterval(fetchLowStock, 60000);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("inventory-updated", onInventoryUpdated);
      clearInterval(interval);
    };
  }, [snackbar]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {sessionLoading && <SessionLoader message="Cerrando sesión..." />}
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onNavigate={() => setSidebarOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/50 dark:bg-slate-950/70 lg:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <div
        className={cn(
          "transition-[padding-left] duration-200",
          "pt-14 sm:pt-16 lg:pt-0",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
        )}
      >
        <Navbar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        <main className="p-4 sm:p-6 min-w-0 pb-20 lg:pb-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        <BottomNav onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}

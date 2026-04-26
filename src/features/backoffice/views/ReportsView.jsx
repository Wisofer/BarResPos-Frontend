import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { BackofficePageShell } from "../components/index.js";
import { ReportCatalog } from "../components/reports/ReportCatalog.jsx";
import { ReportFilters } from "../components/reports/ReportFilters.jsx";
import { ReportTables } from "../components/reports/ReportTables.jsx";
import { OrderDetailModal } from "../components/reports/OrderDetailModal.jsx";
import { CategoriaProductosModal } from "../components/reports/CategoriaProductosModal.jsx";
import { useReports } from "../hooks/useReports.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { formatCurrency } from "../utils/currency.js";

export function ReportsView({ currencySymbol = "C$" }) {
  const snackbar = useSnackbar();
  const {
    activeReport,
    setActiveReport,
    loading,
    search,
    setSearch,
    filtroVentas,
    setFiltroVentas,
    topN,
    setTopN,
    dateFilters,
    setDateFilters,
    reportData,
    ventasResumenVista,
    loadReportData,
    exportReport,
    exportCategoriaDesglose,
    resetFilters,
    ventasRows,
    productosTopRows,
    meserosRows,
    categoriasRows,
    movimientosRows,
    ventaDetailOpen,
    setVentaDetailOpen,
    ventaDetailLoading,
    ventaDetailData,
    onOpenVentaDetail,
    categoriaProductosOpen,
    setCategoriaProductosOpen,
    categoriaProductosLoading,
    categoriaSeleccionada,
    categoriaProductos,
    onOpenCategoriaProductos,
  } = useReports(snackbar.success, snackbar.error);

  useEffect(() => {
    if (activeReport) loadReportData();
  }, [activeReport, loadReportData]);

  return (
    <BackofficePageShell maxWidth="7xl" className="space-y-4">
      {!activeReport ? (
        <ReportCatalog setActiveReport={setActiveReport} />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reporte: {activeReport.replace("-", " ")}</h3>
                {activeReport === "ventas" && ventasResumenVista && (
                  <p className="mt-1 text-sm text-slate-600">
                    Total ventas: <span className="font-semibold">{formatCurrency(ventasResumenVista.totalVentas ?? 0)}</span>
                    {ventasResumenVista.totalOrdenes != null ? (
                      <>
                        {" "}
                        · <span className="font-medium text-slate-700">{ventasResumenVista.totalOrdenes}</span>{" "}
                        {ventasResumenVista.totalOrdenes === 1 ? "orden" : "órdenes"}
                      </>
                    ) : null}
                    {ventasResumenVista.promedioTicket != null && ventasResumenVista.totalOrdenes > 0 ? (
                      <>
                        {" "}
                        · ticket prom. {formatCurrency(ventasResumenVista.promedioTicket ?? 0)}
                      </>
                    ) : null}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al catálogo
              </button>
            </div>
          </div>

          <ReportFilters
            activeReport={activeReport}
            dateFilters={dateFilters}
            setDateFilters={setDateFilters}
            search={search}
            setSearch={setSearch}
            filtroVentas={filtroVentas}
            setFiltroVentas={setFiltroVentas}
            topN={topN}
            setTopN={setTopN}
            loading={loading}
            loadReportData={loadReportData}
            exportReport={exportReport}
            exportCategoriaDesglose={exportCategoriaDesglose}
            resetFilters={resetFilters}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <ReportTables
              activeReport={activeReport}
              loading={loading}
              reportData={reportData}
              ventasRows={ventasRows}
              productosTopRows={productosTopRows}
              meserosRows={meserosRows}
              categoriasRows={categoriasRows}
              movimientosRows={movimientosRows}
              onOpenVentaDetail={onOpenVentaDetail}
              onOpenCategoriaProductos={onOpenCategoriaProductos}
              currencySymbol={currencySymbol}
            />
          </div>
        </>
      )}

      <OrderDetailModal
        open={ventaDetailOpen}
        onClose={() => setVentaDetailOpen(false)}
        loading={ventaDetailLoading}
        data={ventaDetailData}
      />
      <CategoriaProductosModal
        open={categoriaProductosOpen}
        onClose={() => setCategoriaProductosOpen(false)}
        loading={categoriaProductosLoading}
        categoria={categoriaSeleccionada}
        productos={categoriaProductos}
      />
    </BackofficePageShell>
  );
}

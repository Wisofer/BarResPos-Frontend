import React, { useState, useCallback } from "react";
import { BackofficeListSkeletonLoading, BackofficePageShell } from "../components/index.js";
import { useCashier } from "../hooks/useCashier.js";
import { CashierStatusCards } from "../components/cashier/CashierStatusCards.jsx";
import { CashierForms } from "../components/cashier/CashierForms.jsx";
import { CashierSummary } from "../components/cashier/CashierSummary.jsx";
import { CashierHistory } from "../components/cashier/CashierHistory.jsx";
import { backofficeApi } from "../services/backofficeApi.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

export function CashierView({ currencySymbol = "C$" }) {
  const snackbar = useSnackbar();
  const [exportingExcel, setExportingExcel] = useState(false);
  const {
    estado,
    preview,
    historial,
    historialPage,
    historialTotalPages,
    cierreDetalle,
    clearCierreDetalle,
    error,
    processing,
    loading,
    showApertura,
    setShowApertura,
    showHistorial,
    setShowHistorial,
    showCierreForm,
    setShowCierreForm,
    montoInicial,
    setMontoInicial,
    cierreForm,
    setCierreForm,
    loadAll,
    handleAperturaCaja,
    handleCerrarCaja,
    loadDetalleCierre,
  } = useCashier(currencySymbol);

  const handleExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      await backofficeApi.exportarCajaHistorialExcel();
      snackbar.success("Excel descargado.");
    } catch (e) {
      snackbar.error(e?.message || "No se pudo exportar. Verificá con el administrador la ruta de export en el API.");
    } finally {
      setExportingExcel(false);
    }
  }, [snackbar]);

  if (loading) return <BackofficeListSkeletonLoading rows={5} maxWidth="4xl" />;

  const totalEfectivo =
    preview?.totales?.totalEfectivo ??
    preview?.totales?.efectivo ??
    preview?.totalEfectivo ??
    preview?.efectivo ??
    0;
  const totalTarjeta =
    preview?.totales?.totalTarjeta ?? preview?.totales?.tarjeta ?? preview?.totalTarjeta ?? preview?.tarjeta ?? 0;
  const totalTransferencia =
    preview?.totales?.totalTransferencia ?? preview?.totales?.transferencia ?? preview?.totalTransferencia ?? preview?.transferencia ?? 0;
  const totalVentas = preview?.totales?.totalVentasNetas ?? preview?.totales?.TotalVentasNetas ?? preview?.totalGeneral ?? 0;
  const totalOrdenes = preview?.totales?.totalOrdenesPagadas ?? preview?.totales?.totalOrdenes ?? preview?.totalOrdenes ?? 0;
  const montoInicialActual = preview?.cierre?.montoInicial ?? estado?.caja?.montoInicial ?? 0;
  const montoEsperadoCalculado =
    preview?.totales?.montoEsperado ??
    preview?.totales?.MontoEsperado ??
    (Number(montoInicialActual || 0) + Number(totalEfectivo || 0));
  const cajaAbierta = estado?.abierta || estado?.estado === "Abierto";

  return (
    <BackofficePageShell maxWidth="4xl" className="space-y-5">
      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <CashierStatusCards
        cajaAbierta={cajaAbierta}
        showApertura={showApertura}
        setShowApertura={setShowApertura}
        showCierreForm={showCierreForm}
        setShowCierreForm={setShowCierreForm}
      />

      <CashierForms
        showApertura={showApertura}
        setShowApertura={setShowApertura}
        montoInicial={montoInicial}
        setMontoInicial={setMontoInicial}
        handleAperturaCaja={handleAperturaCaja}
        showCierreForm={showCierreForm}
        cierreForm={cierreForm}
        setCierreForm={setCierreForm}
        handleCerrarCaja={handleCerrarCaja}
        processing={processing}
        currencySymbol={currencySymbol}
        montoEsperadoEnCaja={montoEsperadoCalculado}
      />

      {cajaAbierta && (
        <CashierSummary
          totalVentas={totalVentas}
          totalOrdenes={totalOrdenes}
          totalEfectivo={totalEfectivo}
          totalTarjeta={totalTarjeta}
          totalTransferencia={totalTransferencia}
          montoEsperadoCalculado={montoEsperadoCalculado}
          montoInicialActual={montoInicialActual}
          currencySymbol={currencySymbol}
        />
      )}

      <CashierHistory
        showHistorial={showHistorial}
        setShowHistorial={setShowHistorial}
        historial={historial}
        historialPage={historialPage}
        historialTotalPages={historialTotalPages}
        loadAll={loadAll}
        loadDetalleCierre={loadDetalleCierre}
        cierreDetalle={cierreDetalle}
        clearCierreDetalle={clearCierreDetalle}
        processing={processing}
        currencySymbol={currencySymbol}
        onExportExcel={handleExportExcel}
        exportingExcel={exportingExcel}
      />
    </BackofficePageShell>
  );
}

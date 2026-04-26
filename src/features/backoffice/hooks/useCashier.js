import { useState, useEffect, useCallback } from "react";
import { backofficeApi } from "../services/backofficeApi.js";
import { PAGINATION } from "../constants/pagination.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { formatDiffForMessage } from "../utils/cashierArqueo.js";
import { normalizarDetalleCierreResponse } from "../utils/caja.js";

function isEmptyGuardadoPending(row) {
  const estado = String(row?.estado ?? row?.Estado ?? "").toLowerCase();
  const monto = Number(row?.monto ?? row?.Monto ?? 0);
  return estado === "guardado" && monto <= 0;
}

export function useCashier(currencySymbol = "C$") {
  const snackbar = useSnackbar();
  const [estado, setEstado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialTotalPages, setHistorialTotalPages] = useState(1);
  const [cierreDetalle, setCierreDetalle] = useState(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showApertura, setShowApertura] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showCierreForm, setShowCierreForm] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");
  const [cierreForm, setCierreForm] = useState({ montoReal: "", observaciones: "" });
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);

  const loadAll = useCallback(
    async (page = historialPage) => {
      setError("");
      try {
        const estadoCaja = await backofficeApi.cajaEstado();
        const cajaAbierta = estadoCaja?.abierta || estadoCaja?.estado === "Abierto";
        const pendPromise = cajaAbierta
          ? backofficeApi.cajaOrdenesPendientes().catch(() => [])
          : Promise.resolve([]);
        let prev = null;
        if (cajaAbierta) {
          try {
            prev = await backofficeApi.cajaCierrePreview();
          } catch {
            prev = null;
          }
        }
        const [hist, pend] = await Promise.all([
          backofficeApi
            .cajaHistorial({ page, pageSize: PAGINATION.LIST_DEFAULT })
            .catch(() => ({ items: [], totalPages: 1, page: 1 })),
          pendPromise,
        ]);
        setEstado(estadoCaja || null);
        setPreview(prev || null);
        const pendingRaw = Array.isArray(pend) ? pend : [];
        setOrdenesPendientes(pendingRaw.filter((x) => !isEmptyGuardadoPending(x)));
        const rawItems = hist?.items ?? hist?.Items;
        setHistorial(Array.isArray(rawItems) ? rawItems : Array.isArray(hist) ? hist : []);
        setHistorialPage(hist?.page ?? hist?.Page ?? page);
        setHistorialTotalPages(hist?.totalPages ?? hist?.TotalPages ?? 1);

        if (cajaAbierta && showApertura) setShowApertura(false);
      } catch (e) {
        setError(e.message || "Error al cargar datos de caja.");
      }
    },
    [historialPage, showApertura],
  );

  useEffect(() => {
    let mounted = true;
    loadAll(1)
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "No se pudo cargar caja.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // Carga inicial única; el resto va por loadAll(n) al paginar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAperturaCaja = async (e) => {
    if (e) e.preventDefault();
    const monto = Number(montoInicial);
    if (!Number.isFinite(monto) || monto <= 0) {
      snackbar.error("El monto inicial debe ser mayor a 0.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      await backofficeApi.cajaApertura(monto);
      snackbar.success("Caja abierta correctamente.");
      setMontoInicial("");
      setShowApertura(false);
      await loadAll(1);
    } catch (err) {
      snackbar.error(err.message || "No se pudo abrir la caja.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCerrarCaja = async (e) => {
    if (e) e.preventDefault();
    setProcessing(true);
    setError("");
    try {
      const result = await backofficeApi.cajaCerrar({
        montoReal: Number(cierreForm.montoReal || 0),
        observaciones: cierreForm.observaciones || undefined,
      });
      const diffRaw = result?.diferencia ?? result?.Diferencia;
      const diffNum = diffRaw != null ? Number(diffRaw) : NaN;
      if (Number.isFinite(diffNum)) {
        const arqueoTxt = formatDiffForMessage(diffNum, currencySymbol);
        snackbar.success(`Caja cerrada. Arqueo: ${arqueoTxt}.`);
      } else {
        snackbar.success("Caja cerrada correctamente.");
      }
      setCierreForm({ montoReal: "", observaciones: "" });
      setShowCierreForm(false);
      await loadAll(1);
    } catch (err) {
      snackbar.error(err.message || "No se pudo cerrar la caja.");
    } finally {
      setProcessing(false);
    }
  };

  const loadDetalleCierre = async (id) => {
    setProcessing(true);
    setError("");
    try {
      const data = await backofficeApi.cajaDetalleCierre(id);
      if (!data) {
        snackbar.error("No se pudo cargar el detalle del cierre.");
        setCierreDetalle(null);
        return;
      }
      setCierreDetalle(normalizarDetalleCierreResponse(data));
    } catch (err) {
      const msg = err.message || "No se pudo cargar el detalle del cierre.";
      setError(msg);
      snackbar.error(msg);
      setCierreDetalle(null);
    } finally {
      setProcessing(false);
    }
  };

  const clearCierreDetalle = () => setCierreDetalle(null);

  return {
    estado,
    preview,
    ordenesPendientes,
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
  };
}

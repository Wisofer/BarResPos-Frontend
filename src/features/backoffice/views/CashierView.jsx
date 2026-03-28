import { useEffect, useState } from "react";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton } from "../components/index.js";
import { formatCurrency } from "../utils/currency.js";
import {
  cierreDetalleDiferencia,
  cierreDetalleMontoEsperado,
  cierreDetalleMontoReal,
  cierreFechaRaw,
  cierreHistorialMontoPrincipal,
  cierreId,
} from "../utils/caja.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

export function CashierView({ currencySymbol = "C$" }) {
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

  const loadAll = async (page = historialPage) => {
    setError("");
    const [e, prev, hist] = await Promise.all([
      backofficeApi.cajaEstado(),
      backofficeApi.cajaCierrePreview().catch(() => null),
      backofficeApi.cajaHistorial({ page, pageSize: 10 }).catch(() => ({ items: [], totalPages: 1, page: 1 })),
    ]);
    setEstado(e || null);
    setPreview(prev || null);
    const rawItems = hist?.items ?? hist?.Items;
    setHistorial(Array.isArray(rawItems) ? rawItems : Array.isArray(hist) ? hist : []);
    setHistorialPage(hist?.page ?? hist?.Page ?? page);
    setHistorialTotalPages(hist?.totalPages ?? hist?.TotalPages ?? 1);
    if ((e?.abierta || e?.estado === "Abierto") && showApertura) setShowApertura(false);
  };

  useEffect(() => {
    let mounted = true;
    loadAll(1)
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "No se pudo cargar caja.");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleAperturaCaja = async (e) => {
    e.preventDefault();
    const monto = Number(montoInicial);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto inicial debe ser mayor a 0.");
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
      setError(err.message || "No se pudo abrir la caja.");
      snackbar.error(err.message || "No se pudo abrir la caja.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");
    try {
      await backofficeApi.cajaCierre({
        montoReal: Number(cierreForm.montoReal || 0),
        observaciones: cierreForm.observaciones || undefined,
      });
      snackbar.success("Caja cerrada correctamente.");
      setCierreForm({ montoReal: "", observaciones: "" });
      await loadAll(1);
    } catch (err) {
      setError(err.message || "No se pudo cerrar la caja.");
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
      setCierreDetalle(data || null);
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle del cierre.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <ListSkeleton rows={5} />;
  const totalEfectivo =
    preview?.totales?.efectivo ??
    preview?.totales?.totalEfectivo ??
    preview?.totalEfectivo ??
    preview?.efectivo ??
    0;
  const totalTarjeta =
    preview?.totales?.tarjeta ??
    preview?.totales?.totalTarjeta ??
    preview?.totalTarjeta ??
    preview?.tarjeta ??
    0;
  const totalTransferencia =
    preview?.totales?.transferencia ??
    preview?.totales?.totalTransferencia ??
    preview?.totalTransferencia ??
    preview?.transferencia ??
    0;
  const totalVentas =
    preview?.totales?.totalVentas ??
    preview?.totales?.totalGeneral ??
    preview?.totalVentas ??
    preview?.totalGeneral ??
    0;
  const totalOrdenes =
    preview?.totales?.totalOrdenesPagadas ??
    preview?.totales?.totalOrdenes ??
    preview?.totalOrdenesPagadas ??
    preview?.totalOrdenes ??
    0;
  const montoInicialActual =
    preview?.cierre?.montoInicial ??
    preview?.montoInicial ??
    estado?.cierre?.montoInicial ??
    estado?.montoInicial ??
    estado?.caja?.montoInicial ??
    estado?.cierreActual?.montoInicial ??
    0;
  const montoEsperadoCalculado =
    preview?.cierre?.montoEsperado ??
    preview?.montoEsperado ??
    preview?.totales?.montoEsperado ??
    preview?.totalEsperado ??
    (Number(montoInicialActual || 0) + Number(totalEfectivo || 0));
  const cajaAbierta = estado?.abierta || estado?.estado === "Abierto";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!cajaAbierta && !showApertura && (
        <article className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <span>●</span>
            Estado actual
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">🔒</div>
          <h2 className="text-2xl font-bold text-slate-900">Caja Cerrada</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            La caja está lista para iniciar. Abre caja para comenzar operaciones del día y habilitar cobros.
          </p>
          <div className="mx-auto mt-5 h-px w-24 bg-slate-200" />
          <button
            onClick={() => setShowApertura(true)}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Abrir Caja
          </button>
        </article>
      )}

      {!cajaAbierta && showApertura && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Apertura de Caja</h2>
              <p className="text-sm text-slate-500">Registra el monto inicial para iniciar operaciones del día</p>
            </div>
            <button
              onClick={() => setShowApertura(false)}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Volver
            </button>
          </div>
          <form onSubmit={handleAperturaCaja} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Monto inicial ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                placeholder="Ej: 1500.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Ingresa el monto inicial en córdobas que tendrá la caja al iniciar el día.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={processing}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Abrir Caja
              </button>
              <button
                type="button"
                onClick={() => setShowApertura(false)}
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </article>
      )}

      {cajaAbierta && (
        <>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Caja Abierta</h2>
                <p className="text-sm text-emerald-700">Operando correctamente para este día.</p>
              </div>
              <button
                onClick={() => setShowCierreForm((v) => !v)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {showCierreForm ? "Ocultar cierre" : "Cerrar caja"}
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Resumen del día</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Ventas</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalVentas, currencySymbol)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Órdenes</p>
                <p className="text-lg font-bold text-slate-900">{totalOrdenes}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Efectivo</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalEfectivo, currencySymbol)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Tarj + Transf.</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTarjeta + totalTransferencia, currencySymbol)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">Monto esperado en caja</p>
              <p className="text-2xl font-extrabold text-amber-900">{formatCurrency(montoEsperadoCalculado, currencySymbol)}</p>
            </div>
          </article>

          {showCierreForm && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Formulario de cierre</h3>
              <form onSubmit={handleCerrarCaja} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="number"
                  step="0.01"
                  value={cierreForm.montoReal}
                  onChange={(e) => setCierreForm((s) => ({ ...s, montoReal: e.target.value }))}
                  placeholder="Monto real contado"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  value={cierreForm.observaciones}
                  onChange={(e) => setCierreForm((s) => ({ ...s, observaciones: e.target.value }))}
                  placeholder="Observaciones (opcional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmar cierre
                </button>
              </form>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Historial de cierres</h3>
              <button
                onClick={() => setShowHistorial((v) => !v)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {showHistorial ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showHistorial && (
              <>
                <div className="mt-3 mb-3 flex items-center gap-2">
                  <button
                    onClick={() => loadAll(Math.max(1, historialPage - 1))}
                    disabled={historialPage <= 1 || processing}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-slate-500">
                    Página {historialPage} de {historialTotalPages}
                  </span>
                  <button
                    onClick={() => loadAll(Math.min(historialTotalPages, historialPage + 1))}
                    disabled={historialPage >= historialTotalPages || processing}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                {historial.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin cierres registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {historial.map((item, i) => {
                      const cid = cierreId(item) ?? i + 1;
                      return (
                        <div key={cid} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-slate-800">Cierre #{cid}</p>
                            <p className="text-xs text-slate-500">{String(cierreFechaRaw(item)).slice(0, 19)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(cierreHistorialMontoPrincipal(item), currencySymbol)}
                            </span>
                            <button
                              type="button"
                              onClick={() => loadDetalleCierre(cierreId(item))}
                              disabled={cierreId(item) == null}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              Detalle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </article>
        </>
      )}

      {cierreDetalle && (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Detalle de cierre</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Monto esperado</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(cierreDetalleMontoEsperado(cierreDetalle), currencySymbol)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Monto real</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(cierreDetalleMontoReal(cierreDetalle), currencySymbol)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Diferencia</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(cierreDetalleDiferencia(cierreDetalle), currencySymbol)}</p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

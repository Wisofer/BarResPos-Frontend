import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, Eye, FilterX, Pencil, Printer, Search, X, XCircle } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton } from "../components/index.js";
import { PAGINATION } from "../constants/pagination.js";
import { formatCurrency } from "../utils/currency.js";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { isAdminUser } from "../utils/auth.js";
import {
  pagoDescuentoAtribuidoCordobas,
  pagoDescuentoMotivo,
  pagoFecha,
  pagoMontoNetoCobradoCordobas,
  pagoTipo,
  pedidoDescuentoCobroCordobas,
  pedidoPagosLista,
  pedidoSubtotalConsumoCordobas,
  pedidoTotalNetoCobradoCordobas,
} from "../utils/pedidoCobro.js";

function statusClass(status) {
  if (status === "Listo") return "bg-emerald-50 text-emerald-700";
  if (status === "Entregado") return "bg-blue-50 text-blue-700";
  if (status === "Despacho") return "bg-violet-50 text-violet-700";
  if (status === "Pagado") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelado") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("es-NI");
  const time = d.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time };
}

function formatDateTimeLabel(value) {
  const parsed = formatDateTime(value);
  if (parsed === "-") return "-";
  return `${parsed.date} ${parsed.time}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function OrdersView({ currencySymbol = "C$" }) {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const isAdmin = isAdminUser(user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState({
    totalPedidos: 0,
    pagados: 0,
    pendientes: 0,
    montoTotal: 0,
    montoTotalCobradoNeto: null,
    descuentoTotalCordobas: 0,
  });
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalItems: 0 });
  const [detailOrder, setDetailOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState({ open: false, order: null });
  const [editForm, setEditForm] = useState({
    mesaId: "",
    clienteId: "",
    meseroId: "",
    estado: "",
    estadoCocina: "",
    observaciones: "",
    items: [],
  });
  const [filters, setFilters] = useState({
    estado: "",
    mesaId: "",
    meseroId: "",
    desde: "",
    hasta: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filterParams = {
        estado: filters.estado || undefined,
        mesaId: filters.mesaId || undefined,
        meseroId: filters.meseroId || undefined,
        desde: filters.desde || undefined,
        hasta: filters.hasta || undefined,
      };

      const [resumen, listado] = await Promise.all([
        backofficeApi.pedidosResumen(filterParams),
        backofficeApi.listPedidos({ ...filterParams, page, pageSize: PAGINATION.LIST_DEFAULT }),
      ]);

      const items = listado?.items || [];
      const mapped = items.map((p, i) => {
        const consumo = pedidoSubtotalConsumoCordobas(p);
        const neto = pedidoTotalNetoCobradoCordobas(p);
        return {
          rowId: p.id,
          id: p.codigo || p.numero || `#${1200 + i}`,
          numero: p.numero || null,
          table: p.mesa || p.mesaNombre || p.origen || "Mesa",
          waiter: p.mesero || p.meseroNombre || "-",
          mesaId: p.mesaId || null,
          meseroId: p.meseroId || null,
          clienteId: p.clienteId || null,
          estadoCocina: p.estadoCocina || "",
          observaciones: p.observaciones || "",
          createdAt: p.fechaCreacion || null,
          item: p.descripcion || p.resumen || "Pedido",
          productsCount: Number(p.productosCount || 0),
          total: consumo,
          amount: formatCurrency(consumo, currencySymbol),
          totalNetoCobrado: neto,
          amountNeto: neto != null ? formatCurrency(neto, currencySymbol) : null,
          status: p.estado || "Pendiente",
        };
      });

      const netoResumen = resumen?.montoTotalCobradoNetoCordobas ?? resumen?.MontoTotalCobradoNetoCordobas;
      const descResumen = resumen?.descuentoTotalCordobas ?? resumen?.DescuentoTotalCordobas ?? 0;
      const consumoResumen =
        resumen?.montoTotalConsumoCordobas ??
        resumen?.MontoTotalConsumoCordobas ??
        resumen?.montoTotal ??
        resumen?.MontoTotal ??
        0;

      setCards({
        totalPedidos: Number(resumen?.totalPedidos || 0),
        pagados: Number(resumen?.pagados || 0),
        pendientes: Number(resumen?.pendientes || 0),
        montoTotal: Number(consumoResumen || 0),
        montoTotalCobradoNeto: netoResumen != null && netoResumen !== "" ? Number(netoResumen) : null,
        descuentoTotalCordobas: Number(descResumen || 0),
      });
      setOrders(mapped);
      setPageInfo({
        totalPages: Number(listado?.totalPages || 1),
        totalItems: Number(listado?.totalItems || mapped.length),
      });
    } catch (err) {
      setError(err.message || "No se pudo cargar la vista de pedidos.");
    } finally {
      setLoading(false);
    }
  }, [currencySymbol, filters.desde, filters.estado, filters.hasta, filters.mesaId, filters.meseroId, page]);

  const quickStates = useMemo(() => ["", "Pendiente", "Pagado", "En cocina", "Despacho", "Entregado"], []);
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const text = `${order.id} ${order.table} ${order.waiter}`.toLowerCase();
      return text.includes(q);
    });
  }, [orders, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyQuickStatus = (estado) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, estado }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ estado: "", mesaId: "", meseroId: "", desde: "", hasta: "" });
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.mesaId) params.set("mesaId", filters.mesaId);
      if (filters.meseroId) params.set("meseroId", filters.meseroId);
      if (filters.desde) params.set("desde", filters.desde);
      if (filters.hasta) params.set("hasta", filters.hasta);

      const url = `${getApiUrl()}/api/v1/pedidos/exportar-excel${params.toString() ? `?${params.toString()}` : ""}`;
      const token = getToken();
      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("No se pudo exportar el archivo.");
      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(fileUrl);
      snackbar.success("Excel de pedidos descargado correctamente.");
    } catch (err) {
      setError(err.message || "Error exportando pedidos.");
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (order) => {
    setBusyAction(true);
    setError("");
    try {
      const detail = await backofficeApi.getPedido(order.rowId);
      setDetailOrder(detail);
      setShowDetail(true);
      setShowEdit(false);
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle del pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const openEditFromRow = async (order) => {
    setBusyAction(true);
    setError("");
    try {
      const detail = await backofficeApi.getPedido(order.rowId);
      setDetailOrder(detail);
      openEdit(detail);
      setShowDetail(true);
    } catch (err) {
      setError(err.message || "No se pudo abrir edicion del pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const openEdit = (detail) => {
    setEditForm({
      mesaId: detail?.mesaId ?? "",
      clienteId: detail?.clienteId ?? "",
      meseroId: detail?.meseroId ?? "",
      estado: detail?.estado || "",
      estadoCocina: detail?.estadoCocina || "",
      observaciones: detail?.observaciones || "",
      items: (detail?.items || []).map((it) => ({
        id: it.id,
        servicioId: it.servicioId,
        servicio: it.servicio || "Producto",
        cantidad: String(it.cantidad ?? 1),
        precioUnitario: String(it.precioUnitario ?? 0),
        estado: it.estado || "",
        notas: it.notas || "",
      })),
    });
    setShowEdit(true);
  };

  const quickPatchEstado = async (orderId, estado) => {
    setBusyAction(true);
    setError("");
    try {
      await backofficeApi.patchPedidoEstado(orderId, estado);
      snackbar.success("Estado de pedido actualizado.");
      await fetchData();
      if (showDetail && detailOrder?.id === orderId) {
        const refreshed = await backofficeApi.getPedido(orderId);
        setDetailOrder(refreshed);
      }
    } catch (err) {
      setError(err.message || "No se pudo actualizar estado.");
      snackbar.error(err.message || "No se pudo actualizar estado.");
    } finally {
      setBusyAction(false);
    }
  };

  const cancelOrder = async (order) => {
    setConfirmCancel({ open: true, order });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!detailOrder?.id) return;
    setBusyAction(true);
    setError("");
    try {
      const items = editForm.items.map((it) => ({
        servicioId: Number(it.servicioId),
        cantidad: Number(it.cantidad),
        precioUnitario: it.precioUnitario === "" ? null : Number(it.precioUnitario),
        estado: it.estado || null,
        notas: it.notas || null,
      }));
      await backofficeApi.updatePedido(detailOrder.id, {
        mesaId: editForm.mesaId === "" ? null : Number(editForm.mesaId),
        clienteId: editForm.clienteId === "" ? null : Number(editForm.clienteId),
        meseroId: editForm.meseroId === "" ? null : Number(editForm.meseroId),
        estado: editForm.estado || null,
        estadoCocina: editForm.estadoCocina || null,
        observaciones: editForm.observaciones || null,
        items,
      });
      const refreshed = await backofficeApi.getPedido(detailOrder.id);
      setDetailOrder(refreshed);
      setShowEdit(false);
      snackbar.success("Pedido actualizado correctamente.");
      await fetchData();
    } catch (err) {
      setError(err.message || "No se pudo editar el pedido.");
      snackbar.error(err.message || "No se pudo editar el pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const printBlobInHiddenFrame = (blob) =>
    new Promise((resolve) => {
      try {
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        iframe.onload = () => {
          try {
            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } finally {
                setTimeout(() => {
                  URL.revokeObjectURL(blobUrl);
                  iframe.remove();
                  resolve(true);
                }, 1500);
              }
            }, 120);
          } catch {
            URL.revokeObjectURL(blobUrl);
            iframe.remove();
            resolve(false);
          }
        };
        iframe.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          iframe.remove();
          resolve(false);
        };
        document.body.appendChild(iframe);
      } catch {
        resolve(false);
      }
    });

  const openBackendPrintUrl = async (url) => {
    if (!url) return false;
    const token = getToken();
    const resolved = url?.startsWith("http") ? url : `${getApiUrl()}${url?.startsWith("/") ? url : `/${url}`}`;
    try {
      const res = await fetch(resolved, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return false;
      const blob = await res.blob();
      return await printBlobInHiddenFrame(blob);
    } catch {
      return false;
    }
  };

  const openBackendPrintHtml = async (html) => {
    if (!html || typeof html !== "string") return false;
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      return await printBlobInHiddenFrame(blob);
    } catch {
      return false;
    }
  };

  const printOrderTicket = async (order) => {
    if (!order) return;
    const orderId = order?.id ?? order?.Id ?? null;
    if (orderId) {
      try {
        const pre = await backofficeApi.pedidoPrecuenta(orderId);
        const urlPrecuenta =
          pre?.urlImpresionPrecuenta ??
          pre?.UrlImpresionPrecuenta ??
          pre?.urlImpresion ??
          pre?.UrlImpresion ??
          null;
        const htmlPrecuenta = pre?.htmlPrecuenta ?? pre?.HtmlPrecuenta ?? null;

        if (urlPrecuenta) {
          const opened = await openBackendPrintUrl(urlPrecuenta);
          if (opened) {
            snackbar.info("Pre-cuenta lista para imprimir.");
            return;
          }
        }
        if (htmlPrecuenta) {
          const openedHtml = await openBackendPrintHtml(htmlPrecuenta);
          if (openedHtml) {
            snackbar.info("Pre-cuenta lista para imprimir.");
            return;
          }
        }
        const htmlDirect = await backofficeApi.pedidoPrecuentaHtml(orderId).catch(() => null);
        const directValue = typeof htmlDirect === "string" ? htmlDirect : htmlDirect?.html ?? htmlDirect?.Html ?? null;
        if (directValue) {
          const openedDirect = await openBackendPrintHtml(directValue);
          if (openedDirect) {
            snackbar.info("Pre-cuenta lista para imprimir.");
            return;
          }
        }
      } catch {
        // fallback local
      }
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const sumLines = items.reduce((acc, it) => acc + Number(it.monto || 0), 0);
    const subConsumoPrint = pedidoSubtotalConsumoCordobas(order) || sumLines;
    const descPrint = pedidoDescuentoCobroCordobas(order);
    const netoPrint = pedidoTotalNetoCobradoCordobas(order);
    const rows = items
      .map((it) => {
        const producto = it.servicio || "-";
        const cantidad = Number(it.cantidad || 0);
        const unit = Number(it.precioUnitario || 0);
        const subtotal = Number(it.monto || 0);
        const notas = it.notas || "-";
        return `<tr>
          <td>${escapeHtml(producto)}</td>
          <td style="text-align:center">${escapeHtml(cantidad)}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(unit, currencySymbol))}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(subtotal, currencySymbol))}</td>
          <td>${escapeHtml(notas)}</td>
        </tr>`;
      })
      .join("");

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      snackbar.error("Permite ventanas emergentes para imprimir.");
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Ticket ${escapeHtml(order.numero || `#${order.id}`)}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:16px;color:#111;max-width:820px;margin:0 auto}
      h1{font-size:18px;margin:0 0 4px}
      .meta{font-size:12px;color:#555;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:6px 4px;border-bottom:1px solid #e5e7eb}
      th{text-align:left;background:#f8fafc}
      .totals{margin-top:12px;text-align:right;font-size:13px;line-height:1.5}
      .totals .strong{font-weight:700}
    </style>
  </head>
  <body>
    <h1>Ticket de pedido</h1>
    <div class="meta">
      <div>Pedido: ${escapeHtml(order.numero || `#${order.id}`)}</div>
      <div>Mesa: ${escapeHtml(order.mesa || "-")}</div>
      <div>Mesero: ${escapeHtml(order.mesero || "-")}</div>
      <div>Fecha: ${escapeHtml(formatDateTimeLabel(order.fechaCreacion))}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>P/U</th>
          <th>Subtotal</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#666">Sin productos</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div>Subtotal consumo: <span class="strong">${escapeHtml(formatCurrency(subConsumoPrint, currencySymbol))}</span></div>
      ${
        descPrint > 0.0001
          ? `<div>Descuento (cobro): −${escapeHtml(formatCurrency(descPrint, currencySymbol))}</div>`
          : ""
      }
      ${
        netoPrint != null && Number.isFinite(netoPrint)
          ? `<div>Total pagado (neto): <span class="strong">${escapeHtml(formatCurrency(netoPrint, currencySymbol))}</span></div>`
          : `<div>Total: <span class="strong">${escapeHtml(formatCurrency(subConsumoPrint, currencySymbol))}</span></div>`
      }
    </div>
  </body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // En algunos navegadores el onload+close inmediato cancela el diálogo.
    setTimeout(() => {
      try {
        win.print();
      } catch {
        snackbar.error("No se pudo abrir el diálogo de impresión.");
      }
    }, 180);
  };

  if (loading) return <ListSkeleton rows={6} />;

  if (showDetail && detailOrder) {
    const createdAtLabel = formatDateTimeLabel(detailOrder.fechaCreacion);
    const paidAtLabel = formatDateTimeLabel(detailOrder.fechaPagado);
    const listoAtLabel = ["Listo", "Servido", "Entregado", "Pagado"].includes(String(detailOrder.estado || ""))
      ? paidAtLabel
      : "-";
    const items = Array.isArray(detailOrder.items) ? detailOrder.items : [];
    const subtotalLines = items.reduce((acc, it) => acc + Number(it.monto || 0), 0);
    const subConsumoDetalle = pedidoSubtotalConsumoCordobas(detailOrder) || subtotalLines;
    const descCobroDetalle = pedidoDescuentoCobroCordobas(detailOrder);
    const netoCobradoDetalle = pedidoTotalNetoCobradoCordobas(detailOrder);
    const pagosDetalle = pedidoPagosLista(detailOrder);
    const estadoDetalle = String(detailOrder.estado || "");
    return (
      <div className="min-w-0 max-w-full space-y-4">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de pedido</p>
              <h2 className="mt-1 text-xl font-bold text-slate-800">{detailOrder.numero || `#${detailOrder.id}`}</h2>
              <p className="text-sm text-slate-500">Vista completa del pedido y sus productos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  setShowEdit(false);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                Volver
              </button>
              <button
                type="button"
                onClick={() => printOrderTicket(detailOrder)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                Imprimir
              </button>
              {isAdmin && !showEdit && (
                <button
                  type="button"
                  onClick={() => openEdit(detailOrder)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </section>

        {!showEdit ? (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.7fr_1fr]">
            <section className="space-y-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Informacion del Pedido</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Numero</p><p className="font-semibold text-slate-800">{detailOrder.numero || `#${detailOrder.id}`}</p></article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Fecha y Hora</p><p className="font-semibold text-slate-800">{createdAtLabel}</p></article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Mesa</p><p className="font-semibold text-slate-800">{detailOrder.mesa || "-"}</p></article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Mesero</p><p className="font-semibold text-slate-800">{detailOrder.mesero || "-"}</p></article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Estado</p><span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(detailOrder.estado || "Pendiente")}`}>{detailOrder.estado || "Pendiente"}</span></article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Observaciones</p><p className="font-medium text-slate-700">{detailOrder.observaciones || "-"}</p></article>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Productos del Pedido</h3>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Producto</th>
                      <th className="px-3 py-2 font-semibold">Cantidad</th>
                      <th className="px-3 py-2 font-semibold">Precio Unit.</th>
                      <th className="px-3 py-2 font-semibold">Subtotal</th>
                      <th className="px-3 py-2 font-semibold">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((it) => (
                      <tr key={it.id || `${it.servicioId}-${it.servicio}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{it.servicio || "-"}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{it.cantidad || 0}</td>
                        <td className="px-3 py-2 text-slate-700">{formatCurrency(it.precioUnitario || 0, currencySymbol)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{formatCurrency(it.monto || 0, currencySymbol)}</td>
                        <td className="px-3 py-2 text-slate-700">{it.notas || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-slate-700">Total consumo (subtotal):</td>
                      <td className="px-3 py-2 text-sm font-bold text-slate-900">{formatCurrency(subConsumoDetalle, currencySymbol)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              </article>
            </section>

            <section className="space-y-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Resumen (cobro)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Subtotal consumo</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(subConsumoDetalle, currencySymbol)}</span>
                  </div>
                  {descCobroDetalle > 0.0001 && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Descuento en cobro</span>
                      <span className="font-semibold text-amber-800">−{formatCurrency(descCobroDetalle, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="text-slate-600">Total pagado (neto)</span>
                    <span className="font-bold text-emerald-900">
                      {estadoDetalle === "Pagado" && netoCobradoDetalle != null
                        ? formatCurrency(netoCobradoDetalle, currencySymbol)
                        : "—"}
                    </span>
                  </div>
                </div>
              </article>
              {pagosDetalle.length > 0 && (
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Pagos</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="border-b border-slate-200 text-left text-slate-500">
                        <tr>
                          <th className="py-1.5 pr-2 font-medium">Fecha</th>
                          <th className="py-1.5 pr-2 font-medium">Tipo</th>
                          <th className="py-1.5 pr-2 font-medium text-right">Neto ({currencySymbol})</th>
                          <th className="py-1.5 font-medium text-right">Desc. atrib.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {pagosDetalle.map((pg, idx) => {
                          const pid = pg.id ?? pg.Id ?? `pago-${idx}`;
                          const netoP = pagoMontoNetoCobradoCordobas(pg);
                          const descA = pagoDescuentoAtribuidoCordobas(pg);
                          const motivo = pagoDescuentoMotivo(pg);
                          return (
                            <tr key={pid}>
                              <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateTimeLabel(pagoFecha(pg))}</td>
                              <td className="py-1.5 pr-2">{pagoTipo(pg)}</td>
                              <td className="py-1.5 pr-2 text-right font-medium">
                                {netoP != null ? formatCurrency(netoP, currencySymbol) : "—"}
                              </td>
                              <td className="py-1.5 text-right" title={motivo || undefined}>
                                {descA > 0.0001 ? `−${formatCurrency(descA, currencySymbol)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Fechas</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Creado: {createdAtLabel}</p>
                  <p>Listo: {listoAtLabel}</p>
                  <p>Pagado: {paidAtLabel}</p>
                </div>
              </article>
            </section>
          </div>
        ) : (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Modo edición</p>
              <p className="mt-0.5 text-xs text-amber-800/90">Ajusta los datos del pedido y las líneas; guarda para aplicar o cancela para volver al detalle sin cambios.</p>
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-slate-800">Información del pedido</h3>
              <p className="mt-0.5 text-xs text-slate-500">Mesa, cliente, mesero y estado general (misma jerarquía que en la vista de solo lectura).</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-slate-600">
                  Mesa ID
                  <input
                    type="number"
                    min="1"
                    value={editForm.mesaId}
                    onChange={(e) => setEditForm((s) => ({ ...s, mesaId: e.target.value }))}
                    placeholder="Ej. 13"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Cliente ID
                  <input
                    type="number"
                    min="0"
                    value={editForm.clienteId}
                    onChange={(e) => setEditForm((s) => ({ ...s, clienteId: e.target.value }))}
                    placeholder="Opcional"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Mesero ID
                  <input
                    type="number"
                    min="0"
                    value={editForm.meseroId}
                    onChange={(e) => setEditForm((s) => ({ ...s, meseroId: e.target.value }))}
                    placeholder="Ej. 1"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Estado del pedido
                  <select
                    value={editForm.estado}
                    onChange={(e) => setEditForm((s) => ({ ...s, estado: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {["Pendiente", "En cocina", "Despacho", "Listo", "Entregado", "Pagado", "Cancelado"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Estado cocina (KDS)
                  <select
                    value={editForm.estadoCocina}
                    onChange={(e) => setEditForm((s) => ({ ...s, estadoCocina: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sin definir</option>
                    {["Pendiente", "En cocina", "Listo", "Entregado", "Cancelado"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-600">
                Observaciones
                <textarea
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm((s) => ({ ...s, observaciones: e.target.value }))}
                  placeholder="Notas del pedido (opcional)"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-slate-800">Productos del pedido</h3>
              <p className="mt-0.5 text-xs text-slate-500">Edita cantidad, precio unitario, estado de línea y notas. El ID de producto/servicio debe coincidir con el catálogo.</p>
              <div className="mt-4 space-y-4">
                {editForm.items.map((it, idx) => {
                  const q = Number(it.cantidad) || 0;
                  const pu = Number(it.precioUnitario) || 0;
                  const sub = q * pu;
                  return (
                    <div
                      key={`${it.servicioId}-${idx}`}
                      className="rounded-lg border border-slate-200 bg-slate-50/90 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{it.servicio || "Producto"}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Línea {idx + 1}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200">
                          Subtotal {formatCurrency(sub, currencySymbol)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-1">
                          ID producto / servicio
                          <input
                            type="number"
                            min="1"
                            value={it.servicioId === undefined || it.servicioId === null ? "" : String(it.servicioId)}
                            onChange={(e) =>
                              setEditForm((s) => ({
                                ...s,
                                items: s.items.map((x, i) => (i === idx ? { ...x, servicioId: e.target.value } : x)),
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            value={it.cantidad}
                            onChange={(e) =>
                              setEditForm((s) => ({
                                ...s,
                                items: s.items.map((x, i) => (i === idx ? { ...x, cantidad: e.target.value } : x)),
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          Precio unitario ({currencySymbol})
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.precioUnitario}
                            onChange={(e) =>
                              setEditForm((s) => ({
                                ...s,
                                items: s.items.map((x, i) => (i === idx ? { ...x, precioUnitario: e.target.value } : x)),
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          Estado de la línea
                          <select
                            value={it.estado}
                            onChange={(e) =>
                              setEditForm((s) => ({
                                ...s,
                                items: s.items.map((x, i) => (i === idx ? { ...x, estado: e.target.value } : x)),
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Sin definir</option>
                            {["Pendiente", "En cocina", "Listo", "Entregado", "Cancelado"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">
                        Notas
                        <input
                          value={it.notas}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              items: s.items.map((x, i) => (i === idx ? { ...x, notas: e.target.value } : x)),
                            }))
                          }
                          placeholder="Opcional"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto w-full"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busyAction}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:w-auto w-full"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                {busyAction ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-4">
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-800">Todos los pedidos</h2>
            <p className="text-sm text-slate-500">Consulta, filtra y gestiona todos los pedidos del sistema.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Pedidos totales</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{cards.totalPedidos}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Pagados</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{cards.pagados}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Pendientes</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{cards.pendientes}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3" title="Suma de montos de pedido (consumo), no el ingreso neto">
            <p className="text-xs text-slate-500">Total consumo (pedidos)</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{formatCurrency(cards.montoTotal, currencySymbol)}</p>
          </article>
          <article
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            title="Suma del neto cobrado en pedidos Pagados del filtro; alinea con caja/recibo"
          >
            <p className="text-xs text-slate-500">Cobrado (neto)</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {cards.montoTotalCobradoNeto != null && Number.isFinite(cards.montoTotalCobradoNeto)
                ? formatCurrency(cards.montoTotalCobradoNeto, currencySymbol)
                : "—"}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3" title="Descuentos aplicados en el cobro">
            <p className="text-xs text-slate-500">Descuentos en cobro</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{formatCurrency(cards.descuentoTotalCordobas, currencySymbol)}</p>
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickStates.map((s) => (
            <button
              key={s || "todos"}
              type="button"
              onClick={() => applyQuickStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filters.estado === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s || "Todos"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-w-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pedido, mesa o mesero"
              className="w-full min-w-0 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <input
            value={filters.mesaId}
            onChange={(e) => setFilters((prev) => ({ ...prev, mesaId: e.target.value }))}
            placeholder="Mesa ID"
            className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={filters.meseroId}
            onChange={(e) => setFilters((prev) => ({ ...prev, meseroId: e.target.value }))}
            placeholder="Mesero ID"
            className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.desde}
            onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))}
            className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.hasta}
            onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))}
            className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Mesa</th>
                <th className="px-4 py-3 font-semibold">Mesero</th>
                <th className="px-4 py-3 font-semibold">Productos</th>
                <th className="px-4 py-3 font-semibold">Consumo</th>
                <th className="px-4 py-3 font-semibold">Cobrado (neto)</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay pedidos para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => {
                const dt = formatDateTime(order.createdAt);
                return (
                  <tr key={order.rowId} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{order.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{dt.date}</p>
                      <p>{dt.time}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.table || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>{order.waiter || "-"}</p>
                      <p className="text-xs text-slate-500">{order.meseroId ? `ID ${order.meseroId}` : "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.productsCount} producto(s)</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{order.amount}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.status === "Pagado" && order.amountNeto != null ? (
                        <span className="font-semibold text-emerald-800">{order.amountNeto}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(order)}
                          disabled={busyAction}
                          title="Ver detalle"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openEditFromRow(order)}
                            disabled={busyAction || order.status === "Pagado" || order.status === "Cancelado"}
                            title="Editar pedido"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => cancelOrder(order)}
                            disabled={busyAction || order.status === "Cancelado" || order.status === "Pagado"}
                            title="Cancelar pedido"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Total registros: {pageInfo.totalItems}</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Filtrar
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs font-semibold text-slate-600">Página {page} de {pageInfo.totalPages}</span>
          <button
            type="button"
            disabled={page >= pageInfo.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
      <ConfirmModal
        open={confirmCancel.open}
        onClose={() => setConfirmCancel({ open: false, order: null })}
        onConfirm={async () => {
          if (confirmCancel.order) await quickPatchEstado(confirmCancel.order.rowId, "Cancelado");
        }}
        title="Cancelar pedido"
        message={confirmCancel.order ? `¿Deseas cancelar el pedido ${confirmCancel.order.id}?` : "¿Deseas cancelar este pedido?"}
        confirmLabel="Cancelar pedido"
        variant="danger"
        loading={busyAction}
      />

    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  Eye,
  Minus,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import {
  BackofficeDialog,
  ListSkeleton,
  PosInlineOpcionesPanel,
  PosProductOpcionesModal,
  PosProcesarVentaModal,
} from "../components/index.js";
import { PAGINATION } from "../constants/pagination.js";
import { DEFAULT_TIPO_CAMBIO_USD, formatCurrency } from "../utils/currency.js";
import {
  openAuthenticatedBackendBlobInNewTab,
  openBackendPrintHtml,
  openBackendPrintUrl,
} from "../utils/backofficePrint.js";
import { getPedidoMontoNumeric, mapBackendItemsToCart, posCartToModalLines } from "../utils/posPedido.js";
import { buildDeliveryPedidoBody, mapDeliveryListRow } from "../utils/deliveryPedido.js";
import { fetchPosProductosYCategorias } from "../utils/posCatalogLoad.js";
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
import {
  buildOpcionesResumenLocal,
  genPosLineId,
  getSingleGrupoOpcionesForPosInline,
  normalizeOpcionesGrupos,
  normalizeOpcionesSeleccionadas,
  opcionesSeleccionadasKey,
  productoTieneOpcionesVisibles,
  sumarPrecioAdicionalOpciones,
} from "../utils/productoOpciones.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { useDebouncedListRefetch } from "../hooks/useDebouncedListRefetch.js";

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

export function DeliveryView({ currencySymbol = "C$", exchangeRate }) {
  const snackbar = useSnackbar();
  const tc = Number(exchangeRate) > 0 ? Number(exchangeRate) : DEFAULT_TIPO_CAMBIO_USD;
  const [openBuilder, setOpenBuilder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ nombre: "", telefono: "", direccion: "", observaciones: "" });
  const [listRows, setListRows] = useState([]);
  const [listSearch, setListSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [deliveryPedidoId, setDeliveryPedidoId] = useState(null);
  const deliveryPedidoIdRef = useRef(null);
  const [deliveryCodigo, setDeliveryCodigo] = useState("");
  const [pedidoEstado, setPedidoEstado] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [deliveryOpcionesModal, setDeliveryOpcionesModal] = useState({ open: false, product: null });
  const [deliveryInlineOpcionesProduct, setDeliveryInlineOpcionesProduct] = useState(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalLines, setSaleModalLines] = useState([]);
  const [saleBackendTotal, setSaleBackendTotal] = useState(null);
  const [saleProcessing, setSaleProcessing] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    deliveryPedidoIdRef.current = deliveryPedidoId;
  }, [deliveryPedidoId]);

  const loadDeliveryList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {
        page: 1,
        pageSize: Math.min(PAGINATION.LIST_LARGE, 200),
      };
      const q = listSearch.trim();
      if (q) params.q = q;
      const data = await backofficeApi.listDeliveryPedidos(params);
      const raw = data?.items ?? data?.Items ?? [];
      setListRows(raw.map(mapDeliveryListRow).filter(Boolean));
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cargar pedidos delivery.");
      setListRows([]);
    } finally {
      setListLoading(false);
    }
  }, [listSearch, snackbar]);

  const { requestImmediateRefetch } = useDebouncedListRefetch({
    active: !openBuilder,
    debounceKey: listSearch,
    fetchList: loadDeliveryList,
    setLoading: setListLoading,
    debounceMs: 300,
  });

  const closeDeliveryBuilderToList = useCallback(() => {
    requestImmediateRefetch();
    setOpenBuilder(false);
    setDeliveryInlineOpcionesProduct(null);
  }, [requestImmediateRefetch]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const categoryMatch = !category || String(p.categoriaProductoId || "") === String(category);
      if (!categoryMatch) return false;
      if (!q) return true;
      return `${p.nombre || ""} ${p.codigo || ""}`.toLowerCase().includes(q);
    });
  }, [products, category, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.qty || 0), 0),
    [cart]
  );

  const isPedidoBloqueado = pedidoEstado === "Pagado" || pedidoEstado === "Cancelado";

  const deliveryProductGridClass =
    "grid auto-rows-min grid-cols-2 gap-2 overflow-auto content-start items-stretch xl:grid-cols-3";
  const deliveryProductTileShell =
    "flex min-h-[96px] w-full flex-col justify-end gap-0.5 rounded-md border border-slate-200 bg-gradient-to-b from-slate-200 to-slate-500 px-2 py-2 text-left text-[10px] font-semibold leading-tight text-white shadow-sm sm:min-h-[104px]";

  const deliveryInlineOpcionesPick = useMemo(
    () => (deliveryInlineOpcionesProduct ? getSingleGrupoOpcionesForPosInline(deliveryInlineOpcionesProduct) : null),
    [deliveryInlineOpcionesProduct]
  );

  useEffect(() => {
    if (deliveryInlineOpcionesProduct && !deliveryInlineOpcionesPick) {
      setDeliveryInlineOpcionesProduct(null);
    }
  }, [deliveryInlineOpcionesProduct, deliveryInlineOpcionesPick]);

  const applyPedidoDetail = (detail) => {
    const id = Number(detail?.id ?? detail?.Id);
    setDeliveryPedidoId(Number.isFinite(id) ? id : null);
    setDeliveryCodigo(String(detail?.codigo ?? detail?.Codigo ?? "").trim() || (Number.isFinite(id) ? `#${id}` : ""));
    setPedidoEstado(String(detail?.estado ?? detail?.Estado ?? ""));
    setCustomer({
      nombre: detail?.clienteNombre ?? detail?.ClienteNombre ?? "",
      telefono: detail?.clienteTelefono ?? detail?.ClienteTelefono ?? "",
      direccion: detail?.clienteDireccion ?? detail?.ClienteDireccion ?? "",
      observaciones: detail?.observaciones ?? detail?.Observaciones ?? "",
    });
    const items = detail?.items ?? detail?.Items ?? [];
    setCart(mapBackendItemsToCart(items));
  };

  const openNewDelivery = async () => {
    setOpenBuilder(true);
    setDeliveryPedidoId(null);
    deliveryPedidoIdRef.current = null;
    setDeliveryCodigo("Nuevo pedido");
    setPedidoEstado("");
    setCart([]);
    setSearch("");
    setCategory("");
    setCustomer({ nombre: "", telefono: "", direccion: "", observaciones: "" });
    setDeliveryInlineOpcionesProduct(null);
    setLoading(true);
    try {
      const { products: p, categories: c } = await fetchPosProductosYCategorias(
        backofficeApi,
        PAGINATION.POS_PRODUCTOS
      );
      setProducts(p);
      setCategories(c);
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cargar el catalogo para delivery.");
    } finally {
      setLoading(false);
    }
  };

  const ensureCatalogLoaded = async () => {
    if (products.length > 0 && categories.length > 0) return;
    setLoading(true);
    try {
      const { products: p, categories: c } = await fetchPosProductosYCategorias(
        backofficeApi,
        PAGINATION.POS_PRODUCTOS
      );
      setProducts(p);
      setCategories(c);
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cargar el catalogo para delivery.");
    } finally {
      setLoading(false);
    }
  };

  const persistDelivery = async () => {
    if (cart.length === 0) {
      snackbar.info("Agrega productos para el pedido delivery.");
      return null;
    }
    const body = buildDeliveryPedidoBody(customer, cart);
    setActionBusy(true);
    try {
      const currentId = deliveryPedidoIdRef.current;
      if (!currentId) {
        const data = await backofficeApi.createDeliveryPedido(body);
        const id = Number(data?.id ?? data?.Id);
        const codigo = String(data?.codigo ?? data?.Codigo ?? "").trim();
        if (!Number.isFinite(id)) throw new Error("Respuesta inválida al crear pedido.");
        deliveryPedidoIdRef.current = id;
        setDeliveryPedidoId(id);
        setDeliveryCodigo(codigo || `#${id}`);
        setPedidoEstado(String(data?.estado ?? data?.Estado ?? "Guardado"));
        await loadDeliveryList();
        snackbar.success("Pedido guardado.");
        return id;
      }
      await backofficeApi.updateDeliveryPedido(currentId, body);
      const fresh = await backofficeApi.getDeliveryPedido(currentId);
      setPedidoEstado(String(fresh?.estado ?? fresh?.Estado ?? ""));
      await loadDeliveryList();
      snackbar.success("Pedido actualizado.");
      return currentId;
    } catch (e) {
      snackbar.error(e?.message || "No se pudo guardar el pedido.");
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const addCartLine = (product, opcionesSeleccionadas = []) => {
    if (isPedidoBloqueado) return;
    const id = Number(product?.id ?? product?.Id);
    const grupos = normalizeOpcionesGrupos(product);
    const opsNorm = normalizeOpcionesSeleccionadas(opcionesSeleccionadas);
    const opsKey = opcionesSeleccionadasKey(opsNorm);
    const extra = sumarPrecioAdicionalOpciones(grupos, opsNorm);
    const base = Number(product?.precio ?? product?.Precio ?? 0);
    const resumen = buildOpcionesResumenLocal(grupos, opsNorm);
    setCart((prev) => {
      const idx = prev.findIndex(
        (x) =>
          Number(x.id) === id && String(x.opcionesKey ?? "") === String(opsKey) && String(x.notas ?? "").trim() === ""
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          lineId: genPosLineId(),
          id,
          name: String(product?.nombre || product?.Nombre || "Producto"),
          qty: 1,
          price: base + extra,
          notas: "",
          opcionesSeleccionadas: opsNorm,
          opcionesKey: opsKey,
          opcionesResumen: resumen,
        },
      ];
    });
  };

  const addToCart = (product) => {
    if (isPedidoBloqueado) return;
    if (productoTieneOpcionesVisibles(product)) {
      if (getSingleGrupoOpcionesForPosInline(product)) {
        setDeliveryInlineOpcionesProduct(product);
        return;
      }
      setDeliveryOpcionesModal({ open: true, product });
      return;
    }
    addCartLine(product, []);
  };

  const pickDeliveryInlineOpcion = (product, grupoId, opcion) => {
    const oid = Number(opcion?.id ?? opcion?.Id);
    if (!Number.isFinite(oid) || !Number.isFinite(Number(grupoId))) return;
    setDeliveryInlineOpcionesProduct(null);
    addCartLine(product, [{ grupoId: Number(grupoId), opcionId: oid }]);
  };

  const updateQty = (lineId, delta) => {
    if (isPedidoBloqueado) return;
    setCart((prev) =>
      prev
        .map((x) => (x.lineId === lineId ? { ...x, qty: Math.max(0, Number(x.qty || 0) + delta) } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const editSavedDelivery = async (row) => {
    if (row.estado === "Pagado" || row.estado === "Cancelado") {
      snackbar.info("Este pedido no se puede editar.");
      return;
    }
    setActionBusy(true);
    try {
      const detail = await backofficeApi.getDeliveryPedido(row.pedidoId);
      applyPedidoDetail(detail);
      setOpenBuilder(true);
      setSearch("");
      setCategory("");
      setDeliveryInlineOpcionesProduct(null);
      await ensureCatalogLoaded();
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cargar el pedido.");
    } finally {
      setActionBusy(false);
    }
  };

  const viewSavedDelivery = async (row) => {
    setActionBusy(true);
    try {
      const detail = await backofficeApi.getDeliveryPedido(row.pedidoId);
      setDetailOrder(detail);
      setShowDetail(true);
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cargar el detalle del pedido.");
    } finally {
      setActionBusy(false);
    }
  };

  const openBuilderFromDetail = async () => {
    if (!detailOrder) return;
    const estado = String(detailOrder?.estado ?? detailOrder?.Estado ?? "");
    if (estado === "Pagado" || estado === "Cancelado") {
      snackbar.info("Este pedido no se puede editar.");
      return;
    }
    setActionBusy(true);
    try {
      applyPedidoDetail(detailOrder);
      setShowDetail(false);
      setOpenBuilder(true);
      setSearch("");
      setCategory("");
      setDeliveryInlineOpcionesProduct(null);
      await ensureCatalogLoaded();
    } finally {
      setActionBusy(false);
    }
  };

  const cancelSavedDelivery = async (row) => {
    if (row.estado === "Pagado") {
      snackbar.info("Un pedido pagado no se cancela desde aquí.");
      return;
    }
    if (row.estado === "Cancelado") return;
    setActionBusy(true);
    try {
      await backofficeApi.deliveryPedidoCancelar(row.pedidoId);
      snackbar.success("Pedido cancelado.");
      await loadDeliveryList();
    } catch (e) {
      snackbar.error(e?.message || "No se pudo cancelar el pedido.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelar = () => {
    if (deliveryPedidoIdRef.current) {
      snackbar.info("Este pedido ya está guardado. Usá la lista para cancelarlo o seguí editando.");
      return;
    }
    setCart([]);
    setCustomer({ nombre: "", telefono: "", direccion: "", observaciones: "" });
    snackbar.info("Borrador limpiado.");
  };

  const handleImprimirCuenta = async () => {
    if (cart.length === 0) {
      snackbar.info("No hay productos para imprimir.");
      return;
    }
    const pid = await persistDelivery();
    if (!pid) return;
    setActionBusy(true);
    try {
      const pre = await backofficeApi.deliveryPedidoPrecuenta(pid);
      const urlPrecuenta =
        pre?.urlImpresionPrecuenta ??
        pre?.UrlImpresionPrecuenta ??
        pre?.urlImpresion ??
        pre?.UrlImpresion ??
        null;
      const htmlPrecuenta = pre?.htmlPrecuenta ?? pre?.HtmlPrecuenta ?? null;

      if (urlPrecuenta && (await openBackendPrintUrl(urlPrecuenta))) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }
      if (htmlPrecuenta && (await openBackendPrintHtml(htmlPrecuenta))) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }
      try {
        const rawHtml = await backofficeApi.deliveryPedidoPrecuentaHtml(pid);
        const htmlDirect = typeof rawHtml === "string" ? rawHtml : rawHtml?.html ?? rawHtml?.Html ?? null;
        if (htmlDirect && (await openBackendPrintHtml(htmlDirect))) {
          snackbar.info("Pre-cuenta lista para imprimir.");
          return;
        }
      } catch {
        /* ignore */
      }
      snackbar.error("No se pudo obtener la pre-cuenta para imprimir.");
    } catch (e) {
      snackbar.error(e?.message || "No se pudo imprimir la cuenta.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleEnviarCocina = async () => {
    if (cart.length === 0) {
      snackbar.info("Agrega productos para enviar a cocina.");
      return;
    }
    if (isPedidoBloqueado) return;
    const pid = await persistDelivery();
    if (!pid) return;
    setActionBusy(true);
    try {
      await backofficeApi.deliveryPedidoEnviarCocina(pid);
      const fresh = await backofficeApi.getDeliveryPedido(pid);
      setPedidoEstado(String(fresh?.estado ?? fresh?.Estado ?? ""));
      await loadDeliveryList();
      snackbar.success("Pedido enviado a cocina.");
    } catch (e) {
      snackbar.error(e?.message || "No se pudo enviar a cocina.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleGuardar = () => {
    void persistDelivery();
  };

  const handleProcesarOrden = async () => {
    if (cart.length === 0) {
      snackbar.info("Agrega productos para procesar la orden.");
      return;
    }
    if (isPedidoBloqueado) return;
    const pid = await persistDelivery();
    if (!pid) return;
    setActionBusy(true);
    try {
      const detail = await backofficeApi.getDeliveryPedido(pid);
      const rawItems = detail?.items ?? detail?.Items;
      const lineCart =
        Array.isArray(rawItems) && rawItems.length > 0 ? mapBackendItemsToCart(rawItems) : cart;
      setSaleModalLines(posCartToModalLines(lineCart));
      setSaleBackendTotal(getPedidoMontoNumeric(detail));
      setSaleModalOpen(true);
    } catch (e) {
      snackbar.error(e?.message || "No se pudo abrir el cobro.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleGuardarVenta = async (form) => {
    const pid = deliveryPedidoIdRef.current;
    if (!pid) return;
    setSaleProcessing(true);
    try {
      const obsParts = [
        form.comentario,
        form.descuento > 0 ? `Descuento: ${form.descuento}` : null,
        form.moneda === "USD" ? `TC: ${form.tipoCambioAplicado}` : null,
        form.tipoPago === "Efectivo"
          ? `Recibido: ${form.montoRecibido} ${form.moneda}, Vuelto: ${form.vueltoMoneda} ${form.moneda} (${form.vueltoCordobas} C$)`
          : null,
      ].filter(Boolean);

      const montoPagado =
        form.tipoPago === "Efectivo" ? Number(form.montoRecibidoCordobas || 0) : Number(form.totalAPagarCordobas || 0);

      const descuentoMonto = Number(form.descuento) > 0 ? Number(form.descuento) : undefined;
      const descuentoMotivo =
        descuentoMonto != null && String(form.comentario || "").trim() ? String(form.comentario).trim() : undefined;

      const payload = {
        ordenId: Number(pid),
        tipoPago: form.tipoPago,
        montoPagado,
        moneda: "C",
        banco: null,
        tipoCuenta: null,
        observaciones: obsParts.join(" | ") || "Pago delivery",
        montoCordobasFisico: null,
        montoDolaresFisico: null,
        montoCordobasElectronico: null,
        montoDolaresElectronico: null,
        ...(descuentoMonto != null ? { descuentoMonto, ...(descuentoMotivo ? { descuentoMotivo } : {}) } : {}),
      };

      let resp;
      try {
        resp = await backofficeApi.deliveryPedidoGestionarPago(pid, payload);
      } catch {
        resp = await backofficeApi.deliveryPedidoProcesarPago(pid, payload);
      }

      const url = resp?.urlImpresionRecibo ?? resp?.UrlImpresionRecibo ?? resp?.url ?? resp?.Url;
      if (url) {
        await openAuthenticatedBackendBlobInNewTab(url);
      }

      snackbar.success("Venta procesada.");
      window.dispatchEvent(new CustomEvent("barrest-inventory-updated"));
      setSaleModalOpen(false);
      setSaleBackendTotal(null);
      requestImmediateRefetch();
      setOpenBuilder(false);
      setDeliveryPedidoId(null);
      deliveryPedidoIdRef.current = null;
      setDeliveryCodigo("");
      setPedidoEstado("");
      setCart([]);
    } catch (e) {
      snackbar.error(e?.message || "No se pudo registrar el pago.");
    } finally {
      setSaleProcessing(false);
    }
  };

  const printDeliveryFromDetail = async (detail) => {
    const pid = Number(detail?.id ?? detail?.Id);
    if (!Number.isFinite(pid)) {
      snackbar.error("No se encontró el ID del pedido.");
      return;
    }
    setActionBusy(true);
    try {
      const pre = await backofficeApi.deliveryPedidoPrecuenta(pid);
      const urlPrecuenta =
        pre?.urlImpresionPrecuenta ??
        pre?.UrlImpresionPrecuenta ??
        pre?.urlImpresion ??
        pre?.UrlImpresion ??
        null;
      const htmlPrecuenta = pre?.htmlPrecuenta ?? pre?.HtmlPrecuenta ?? null;

      if (urlPrecuenta && (await openBackendPrintUrl(urlPrecuenta))) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }
      if (htmlPrecuenta && (await openBackendPrintHtml(htmlPrecuenta))) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }
      try {
        const rawHtml = await backofficeApi.deliveryPedidoPrecuentaHtml(pid);
        const htmlDirect = typeof rawHtml === "string" ? rawHtml : rawHtml?.html ?? rawHtml?.Html ?? null;
        if (htmlDirect && (await openBackendPrintHtml(htmlDirect))) {
          snackbar.info("Pre-cuenta lista para imprimir.");
          return;
        }
      } catch {
        // sin fallback adicional; mantenemos mismo canal de impresión backend
      }
      snackbar.error("No se pudo obtener la pre-cuenta para imprimir.");
    } catch (e) {
      snackbar.error(e?.message || "No se pudo imprimir la cuenta.");
    } finally {
      setActionBusy(false);
    }
  };

  if (showDetail && detailOrder) {
    const createdAtLabel = formatDateTimeLabel(detailOrder.fechaCreacion ?? detailOrder.createdAt ?? detailOrder.CreatedAt);
    const paidAtLabel = formatDateTimeLabel(detailOrder.fechaPagado ?? detailOrder.FechaPagado);
    const listoAtLabel = ["Listo", "Servido", "Entregado", "Pagado"].includes(String(detailOrder.estado || ""))
      ? paidAtLabel
      : "-";
    const items = Array.isArray(detailOrder.items ?? detailOrder.Items) ? detailOrder.items ?? detailOrder.Items : [];
    const subtotalLines = items.reduce((acc, it) => acc + Number(it.monto ?? it.Monto ?? 0), 0);
    const subConsumoDetalle = pedidoSubtotalConsumoCordobas(detailOrder) || subtotalLines;
    const descCobroDetalle = pedidoDescuentoCobroCordobas(detailOrder);
    const netoCobradoDetalle = pedidoTotalNetoCobradoCordobas(detailOrder);
    const pagosDetalle = pedidoPagosLista(detailOrder);
    const estadoDetalle = String(detailOrder.estado ?? detailOrder.Estado ?? "");
    const codigo = detailOrder.codigo ?? detailOrder.Codigo ?? `#${detailOrder.id ?? detailOrder.Id}`;
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de pedido</p>
              <h2 className="mt-1 text-xl font-bold text-slate-800">{codigo}</h2>
              <p className="text-sm text-slate-500">Vista completa del pedido delivery y sus productos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  setDetailOrder(null);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                Volver
              </button>
              <button
                type="button"
                onClick={() => void printDeliveryFromDetail(detailOrder)}
                disabled={actionBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => void openBuilderFromDetail()}
                disabled={actionBusy || estadoDetalle === "Pagado" || estadoDetalle === "Cancelado"}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Editar
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.7fr_1fr]">
          <section className="space-y-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Informacion del Pedido</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Numero</p><p className="font-semibold text-slate-800">{codigo}</p></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Fecha y Hora</p><p className="font-semibold text-slate-800">{createdAtLabel}</p></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Origen</p><p className="font-semibold text-slate-800">Delivery</p></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Cliente</p><p className="font-semibold text-slate-800">{detailOrder.clienteNombre ?? detailOrder.ClienteNombre ?? "-"}</p></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Telefono</p><p className="font-semibold text-slate-800">{detailOrder.clienteTelefono ?? detailOrder.ClienteTelefono ?? "-"}</p></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Estado</p><span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(estadoDetalle || "Pendiente")}`}>{estadoDetalle || "Pendiente"}</span></article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2 xl:col-span-3"><p className="text-xs text-slate-500">Direccion / observaciones</p><p className="font-medium text-slate-700">{detailOrder.clienteDireccion ?? detailOrder.ClienteDireccion ?? detailOrder.observaciones ?? detailOrder.Observaciones ?? "-"}</p></article>
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
                    {items.map((it, idx) => (
                      <tr key={it.id ?? it.Id ?? `${it.servicioId ?? it.ServicioId ?? "it"}-${idx}`}>
                        <td className="px-3 py-2"><p className="font-medium text-slate-800">{it.servicio ?? it.Servicio ?? it.producto ?? it.Producto ?? "-"}</p></td>
                        <td className="px-3 py-2 text-slate-700">{it.cantidad ?? it.Cantidad ?? 0}</td>
                        <td className="px-3 py-2 text-slate-700">{formatCurrency(it.precioUnitario ?? it.PrecioUnitario ?? 0, currencySymbol)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{formatCurrency(it.monto ?? it.Monto ?? 0, currencySymbol)}</td>
                        <td className="px-3 py-2 text-slate-700">{it.notas ?? it.Notas ?? "-"}</td>
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
                    {estadoDetalle === "Pagado" && netoCobradoDetalle != null ? formatCurrency(netoCobradoDetalle, currencySymbol) : "—"}
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
                            <td className="py-1.5 pr-2 text-right font-medium">{netoP != null ? formatCurrency(netoP, currencySymbol) : "—"}</td>
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
      </div>
    );
  }

  if (!openBuilder) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Delivery</h2>
            <p className="text-xs text-slate-500">Pedidos a domicilio sin mesa.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="inline-flex min-h-[38px] w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:w-[280px]">
              <Search className="h-3.5 w-3.5" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Buscar código, cliente o teléfono"
                className="w-full bg-transparent text-xs text-slate-700 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void openNewDelivery()}
              disabled={actionBusy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" />
              Pedido delivery
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4">
                    <ListSkeleton rows={5} />
                  </td>
                </tr>
              ) : listRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    {listSearch.trim() ? "Sin resultados para la búsqueda." : "Sin pedidos delivery todavía."}
                  </td>
                </tr>
              ) : (
                listRows.map((x) => (
                  <tr key={x.pedidoId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-700">{x.codigo}</td>
                    <td className="px-3 py-2">{x.customer?.nombre || "—"}</td>
                    <td className="px-3 py-2">{x.customer?.telefono || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{x.estado || "—"}</td>
                    <td className="px-3 py-2">{formatCurrency(x.total, currencySymbol)}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(x.createdAt).toLocaleTimeString("es-NI", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => void viewSavedDelivery(x)}
                          disabled={actionBusy}
                          title="Ver detalle"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void editSavedDelivery(x)}
                          disabled={actionBusy || x.estado === "Pagado" || x.estado === "Cancelado"}
                          title="Editar pedido"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void cancelSavedDelivery(x)}
                          disabled={actionBusy || x.estado === "Pagado" || x.estado === "Cancelado"}
                          title="Cancelar pedido"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-sm lg:h-[calc(100vh-10.5rem)]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">DELIVERY | {deliveryCodigo || "Pedido"}</h2>
          <p className="mt-0.5 text-xs text-slate-500">Seleccioná productos para este pedido.</p>
          {pedidoEstado ? (
            <p className="mt-0.5 text-[11px] font-medium text-slate-600">Estado: {pedidoEstado}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => closeDeliveryBuilderToList()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a delivery
          </button>
        </div>
      </div>

      <div className="mb-3 overflow-x-auto rounded-md border border-slate-200 bg-white p-2">
        <div className="flex w-max min-w-full gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`whitespace-nowrap rounded-sm px-4 py-1.5 text-[11px] font-semibold ${!category ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"}`}
          >
            TODOS
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(String(c.id))}
              className={`whitespace-nowrap rounded-sm px-4 py-1.5 text-[11px] font-semibold ${String(category) === String(c.id) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}
            >
              {(c.nombre || c.descripcion || "Categoría").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 grid grid-cols-1 gap-3 lg:grid-cols-[1.45fr_1fr]">
        <article className="flex min-h-0 flex-col rounded-md border border-slate-300 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Orden</h3>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
            {loading ? (
              <ListSkeleton rows={6} />
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Producto</th>
                    <th className="w-[min(28vw,9rem)] px-1 py-2">Nota</th>
                    <th className="px-2 py-2">CNT</th>
                    <th className="px-2 py-2">P/U</th>
                    <th className="px-2 py-2">PT</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                        Sin productos en la orden.
                      </td>
                    </tr>
                  )}
                  {cart.map((item) => (
                    <tr key={item.lineId ?? item.id} className="border-t border-slate-100">
                      <td className="px-2 py-2 align-middle">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        {item.opcionesResumen ? (
                          <div className="mt-0.5 text-[10px] text-slate-500">{item.opcionesResumen}</div>
                        ) : null}
                      </td>
                      <td className="px-1 py-2 align-middle">
                        <input
                          type="text"
                          value={item.notas ?? ""}
                          onChange={(e) =>
                            setCart((prev) =>
                              prev.map((x) => (x.lineId === item.lineId ? { ...x, notas: e.target.value } : x))
                            )
                          }
                          disabled={loading || isPedidoBloqueado}
                          placeholder="ej. sin cebolla"
                          className="box-border w-full min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800 placeholder:text-slate-400"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQty(item.lineId, -1)}
                            disabled={isPedidoBloqueado || actionBusy}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-5 text-center font-semibold text-slate-800">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.lineId, 1)}
                            disabled={isPedidoBloqueado || actionBusy}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 align-middle">{formatCurrency(item.price, currencySymbol)}</td>
                      <td className="whitespace-nowrap px-2 py-2 align-middle font-semibold">
                        <div className="flex items-center justify-between gap-2">
                          <span>{formatCurrency(Number(item.price || 0) * Number(item.qty || 0), currencySymbol)}</span>
                          <button
                            type="button"
                            onClick={() => setCart((prev) => prev.filter((x) => x.lineId !== item.lineId))}
                            disabled={isPedidoBloqueado || actionBusy}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-200 text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {cart.length > 0 && (
            <>
              <div className="mt-2 ml-auto w-full max-w-[220px] space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-bold">{formatCurrency(subtotal, currencySymbol)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1 rounded-sm bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleImprimirCuenta()}
                  disabled={actionBusy || isPedidoBloqueado}
                  className="inline-flex items-center gap-1 rounded-sm bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir cuenta
                </button>
                <button
                  type="button"
                  onClick={() => void handleEnviarCocina()}
                  disabled={actionBusy || isPedidoBloqueado}
                  className="inline-flex items-center gap-1 rounded-sm bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  <ChefHat className="h-3.5 w-3.5" />
                  Enviar cocina
                </button>
                <button
                  type="button"
                  onClick={() => void handleProcesarOrden()}
                  disabled={actionBusy || isPedidoBloqueado}
                  className="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  Procesar orden
                </button>
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={actionBusy || isPedidoBloqueado}
                  className="inline-flex items-center gap-1 rounded-sm bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar
                </button>
              </div>
            </>
          )}
        </article>

        <article className="flex min-h-0 flex-col rounded-md border border-slate-300 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Búsqueda de productos</h3>
          <label className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto"
              disabled={isPedidoBloqueado}
              className="w-full bg-transparent text-xs text-slate-700 outline-none"
            />
          </label>
          <div
            className={
              deliveryInlineOpcionesPick && deliveryInlineOpcionesProduct
                ? "flex min-h-0 flex-1 flex-col rounded-md border border-slate-200 p-2"
                : `min-h-0 flex-1 rounded-md border border-slate-200 p-2 ${deliveryProductGridClass}`
            }
          >
            {deliveryInlineOpcionesPick && deliveryInlineOpcionesProduct ? (
              <PosInlineOpcionesPanel
                product={deliveryInlineOpcionesProduct}
                grupoId={deliveryInlineOpcionesPick.grupoId}
                opciones={deliveryInlineOpcionesPick.opciones}
                onPickOpcion={pickDeliveryInlineOpcion}
                onBack={() => setDeliveryInlineOpcionesProduct(null)}
                currencySymbol={currencySymbol}
                disabled={isPedidoBloqueado}
                gridClassName={`min-h-[220px] flex-1 ${deliveryProductGridClass}`}
                tileClassName={deliveryProductTileShell}
              />
            ) : loading ? (
              <ListSkeleton rows={8} />
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isPedidoBloqueado}
                  className={deliveryProductTileShell}
                >
                  <span>{String(p.nombre || "Producto").toUpperCase()}</span>
                  <span className="text-[10px] text-slate-100">
                    {formatCurrency(Number(p.precio ?? p.Precio ?? 0), currencySymbol)}
                  </span>
                </button>
              ))
            )}
          </div>
        </article>
      </div>
      <PosProcesarVentaModal
        open={saleModalOpen}
        onClose={() => !saleProcessing && setSaleModalOpen(false)}
        mesaLabel={`DELIVERY | ${deliveryCodigo || "Pedido"}`}
        currencySymbol={currencySymbol}
        lines={saleModalLines}
        totalOrdenBackend={saleBackendTotal}
        exchangeRate={tc}
        busy={saleProcessing}
        onGuardar={handleGuardarVenta}
      />
      <PosProductOpcionesModal
        open={deliveryOpcionesModal.open}
        product={deliveryOpcionesModal.product}
        currencySymbol={currencySymbol}
        onClose={() => setDeliveryOpcionesModal({ open: false, product: null })}
        onConfirm={(opcionesSeleccionadas) => {
          const p = deliveryOpcionesModal.product;
          setDeliveryOpcionesModal({ open: false, product: null });
          if (!p) return;
          addCartLine(p, opcionesSeleccionadas);
        }}
      />
      {customerModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-md" onBackdropClick={() => setCustomerModalOpen(false)}>
          <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">Cliente delivery</h3>
            <div className="mt-4 space-y-3">
              <input
                value={customer.nombre}
                onChange={(e) => setCustomer((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre cliente"
                disabled={isPedidoBloqueado}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={customer.telefono}
                onChange={(e) => setCustomer((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="Teléfono"
                disabled={isPedidoBloqueado}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={customer.direccion}
                onChange={(e) => setCustomer((prev) => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección / referencia"
                disabled={isPedidoBloqueado}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="block text-xs font-medium text-slate-600">
                Observaciones del pedido
                <textarea
                  value={customer.observaciones}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, observaciones: e.target.value }))}
                  rows={2}
                  disabled={isPedidoBloqueado}
                  placeholder="Ej. tocar timbre"
                  className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerModalOpen(false);
                  snackbar.success("Datos de cliente listos.");
                }}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
              >
                Guardar cliente
              </button>
            </div>
          </div>
        </BackofficeDialog>
      )}
    </section>
  );
}

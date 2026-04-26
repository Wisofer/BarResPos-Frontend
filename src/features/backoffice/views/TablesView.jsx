import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bookmark,
  ChefHat,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import {
  BackofficeDialog,
  BackofficeStatCardsListSkeleton,
  ListSkeleton,
  PosInlineOpcionesPanel,
  PosProductCatalogTile,
  PosProductOpcionesModal,
  PosProcesarVentaModal,
  CancelPedidoPinModal,
} from "../components/index.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { PAGINATION } from "../constants/pagination.js";
import { DEFAULT_TIPO_CAMBIO_USD, formatCurrency } from "../utils/currency.js";
import { buildUpdatePedidoPayloadForMesaChange } from "../utils/pedidoMesa.js";
import {
  extractPosOrdenResponseId,
  getEstadoCocinaOrden,
  getOrdenItems,
  getOrdenPedidoId,
  getPedidoMontoNumeric,
  isCajaCerradaMessageNormalized,
  isStockShortageConflict409,
  mapBackendItemsToCart,
  normalizeApiErrorMessage,
  posCartToModalLines,
  posCartToPedidoItemsPayload,
  posCartToPosOrdenProductos,
  unwrapEnvelope,
} from "../utils/posPedido.js";
import { isAdminUser } from "../utils/auth.js";
import {
  openBackendPrintHtml,
  openBackendPrintUrl,
} from "../utils/backofficePrint.js";
import { buildPagoPayload } from "../utils/paymentPayload.js";
import { fetchPosProductosYCategorias } from "../utils/posCatalogLoad.js";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import {
  mesaEsOcupadaVisual,
  mesaEsReservada,
  normalizeMesaEstado,
  TablesMesasFloorPlan,
  TablesMesasStatsBar,
  TablesMesasZonesGrid,
} from "../tables/index.js";
import {
  buildOpcionesResumenLocal,
  genPosLineId,
  getSingleGrupoOpcionesForPosInline,
  normalizeOpcionesGrupos,
  normalizeOpcionesSeleccionadas,
  opcionesSeleccionadasKey,
  posLineMergeKey,
  productoTieneOpcionesVisibles,
  sumarPrecioAdicionalOpciones,
  withOpcionesNormalizadas,
} from "../utils/productoOpciones.js";

export function TablesView({ onPosOpenChange, currencySymbol = "C$" }) {
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [posOpen, setPosOpen] = useState(false);
  const [posLoading, setPosLoading] = useState(false);
  const [posTable, setPosTable] = useState(null);
  const [posCategories, setPosCategories] = useState([]);
  const [posProducts, setPosProducts] = useState([]);
  const [posCategory, setPosCategory] = useState("");
  const [posSearch, setPosSearch] = useState("");
  const [posCart, setPosCart] = useState([]);
  const [posOrderId, setPosOrderId] = useState(null);
  const [posCommitted, setPosCommitted] = useState(false);
  const [posActionBusy, setPosActionBusy] = useState(false);
  const [posMobileTab, setPosMobileTab] = useState("products");
  const [activeTableMenu, setActiveTableMenu] = useState(null);
  const posOrderIdRef = useRef(posOrderId);
  /** Cola: cada POST /pos/ordenes se procesa en orden (evita perder clics y desajuste stock/UI). */
  const posSyncChainRef = useRef(Promise.resolve());
  const posSyncPendingCountRef = useRef(0);
  const posCartRef = useRef([]);
  const [form, setForm] = useState({
    id: null,
    numero: "",
    capacidad: 4,
    estado: "Libre",
    ubicacionId: "",
  });
  const tableIllustration = "/assets/images/minimalist-restaurant-table-icon--front-view--two-.png";
  const [confirmDeleteTable, setConfirmDeleteTable] = useState({ open: false, id: null });
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalLines, setSaleModalLines] = useState([]);
  const [saleBackendTotal, setSaleBackendTotal] = useState(null);
  const [saleOrdenId, setSaleOrdenId] = useState(null);
  const [saleProcessing, setSaleProcessing] = useState(false);
  const saleProcessingGuardRef = useRef(false);
  const [tipoCambio, setTipoCambio] = useState(null);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ id: null, nombre: "", descripcion: "", activo: true });
  const [confirmDeleteLocation, setConfirmDeleteLocation] = useState({ open: false, id: null, name: "" });
  const [showInactiveLocations, setShowInactiveLocations] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [posOpcionesModal, setPosOpcionesModal] = useState({ open: false, product: null });
  const [posInlineOpcionesProduct, setPosInlineOpcionesProduct] = useState(null);
  const [moveOrderOpen, setMoveOrderOpen] = useState(false);
  const [moveOrderTargetId, setMoveOrderTargetId] = useState("");
  const [moveOrderCandidates, setMoveOrderCandidates] = useState([]);
  const [posCancelPinOpen, setPosCancelPinOpen] = useState(false);
  /** "zonas" | "plano" */
  const [mesasLayoutMode, setMesasLayoutMode] = useState("zonas");
  const isAdmin = isAdminUser(user);

  const syncCajaEstado = async () => {
    try {
      const caja = await backofficeApi.cajaEstado();
      const abierta = Boolean(caja?.abierta ?? caja?.Abierta ?? (caja?.estado || "").toLowerCase() === "abierto");
      setCajaAbierta(abierta);
      return abierta;
    } catch {
      return cajaAbierta;
    }
  };

  const normalizeLocation = (l) => ({
    id: l?.id ?? l?.Id,
    nombre: l?.nombre ?? l?.Nombre ?? "",
    descripcion: l?.descripcion ?? l?.Descripcion ?? "",
    activo: l?.activo ?? l?.Activo ?? true,
  });

  const mapTable = (m, i) => ({
    id: m.id ?? m.Id,
    displayId: m.numero || m.codigo || `M-${String(i + 1).padStart(2, "0")}`,
    capacity: m.capacidad || 4,
    zone: m.ubicacion?.nombre || m.ubicacion || "Salon",
    status: m.estado || "Libre",
    activeOrdersCount: Number(m.ordenesActivas || 0),
    hasActiveOrder: Number(m.ordenesActivas || 0) > 0 || String(m.estado || "").toLowerCase() === "ocupada",
    detail: m.ordenesActivas > 0 ? `${m.ordenesActivas} orden(es) activa(s)` : "Lista para atender",
  });

  const loadTables = async () => {
    const data = await backofficeApi.listMesas({ page: 1, pageSize: PAGINATION.LIST_LARGE });
    const items = data?.items || [];
    setTables(Array.isArray(items) ? items.map(mapTable) : []);
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadTables(),
      backofficeApi.catalogoUbicaciones(),
      backofficeApi.cajaEstado().catch(() => null),
      backofficeApi.configuracionTipoCambio().catch(() => null),
    ])
      .then(([, ubic, caja, tc]) => {
        if (!mounted) return;
        const raw = Array.isArray(ubic) ? ubic : ubic?.items || [];
        setLocations(raw.map(normalizeLocation));
        const abierta = Boolean(caja?.abierta ?? caja?.Abierta ?? (caja?.estado || "").toLowerCase() === "abierto");
        setCajaAbierta(abierta);
        const tcValue = Number(tc?.tipoCambioDolar ?? tc?.TipoCambioDolar ?? tc?.valor ?? 0);
        if (Number.isFinite(tcValue) && tcValue > 0) setTipoCambio(tcValue);
        else setTipoCambio(DEFAULT_TIPO_CAMBIO_USD);
      })
      .catch((e) => mounted && setError(e.message || "No se pudo cargar mesas."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const openCreate = () => {
    setForm({ id: null, numero: "", capacidad: 4, estado: "Libre", ubicacionId: locations[0]?.id || "" });
    setFormOpen(true);
  };

  const reloadLocations = async () => {
    const ubic = await backofficeApi.catalogoUbicaciones();
    const raw = Array.isArray(ubic) ? ubic : ubic?.items || [];
    setLocations(raw.map(normalizeLocation));
  };

  const openLocationsManager = async () => {
    setSaving(true);
    setError("");
    try {
      await reloadLocations();
      setLocationsModalOpen(true);
      setLocationForm({ id: null, nombre: "", descripcion: "", activo: true });
    } catch (e) {
      const msg = e?.message || "No se pudieron cargar ubicaciones.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const editLocation = async (id) => {
    setSaving(true);
    setError("");
    try {
      const data = await backofficeApi.getUbicacion(id);
      setLocationForm({
        id: data?.id ?? id,
        nombre: data?.nombre || "",
        descripcion: data?.descripcion || "",
        activo: data?.activo !== false,
      });
    } catch (e) {
      const msg = e?.message || "No se pudo cargar ubicación.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        nombre: locationForm.nombre.trim(),
        descripcion: locationForm.descripcion?.trim() || null,
        activo: Boolean(locationForm.activo),
      };
      if (locationForm.id) await backofficeApi.updateUbicacion(locationForm.id, body);
      else await backofficeApi.createUbicacion(body);
      await reloadLocations();
      await loadTables();
      setLocationForm({ id: null, nombre: "", descripcion: "", activo: true });
      snackbar.success(locationForm.id ? "Ubicación actualizada." : "Ubicación creada.");
    } catch (e) {
      const msg = e?.message || "No se pudo guardar ubicación.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const removeLocation = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteUbicacion(id);
      await reloadLocations();
      await loadTables();
      setConfirmDeleteLocation({ open: false, id: null, name: "" });
      if (locationForm.id === id) setLocationForm({ id: null, nombre: "", descripcion: "", activo: true });
      snackbar.success("Ubicación eliminada/desactivada.");
    } catch (e) {
      const msg = e?.message || "No se pudo eliminar ubicación.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleLocationActive = async (loc, nextActive) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.updateUbicacion(loc.id, {
        nombre: loc.nombre || "",
        descripcion: loc.descripcion || null,
        activo: Boolean(nextActive),
      });
      await reloadLocations();
      await loadTables();
      snackbar.success(nextActive ? "Ubicación reactivada." : "Ubicación desactivada.");
    } catch (e) {
      const msg = e?.message || "No se pudo actualizar estado de ubicación.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (id) => {
    setSaving(true);
    setError("");
    try {
      const m = await backofficeApi.getMesa(id);
      setForm({
        id: m.id,
        numero: m.numero || "",
        capacidad: m.capacidad || 4,
        estado: m.estado || "Libre",
        ubicacionId: m.ubicacionId || "",
      });
      setFormOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar detalle de mesa.");
    } finally {
      setSaving(false);
    }
  };

  const saveTable = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        numero: form.numero,
        capacidad: Number(form.capacidad),
        estado: form.estado,
        ubicacionId: Number(form.ubicacionId),
      };
      if (form.id) await backofficeApi.updateMesa(form.id, body);
      else await backofficeApi.createMesa(body);
      await loadTables();
      setFormOpen(false);
      snackbar.success(form.id ? "Mesa actualizada." : "Mesa creada.");
    } catch (e2) {
      snackbar.error(e2.message || "No se pudo guardar la mesa.");
    } finally {
      setSaving(false);
    }
  };

  const _changeStatus = async (id, estado) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.patchMesaEstado(id, estado);
      await loadTables();
      snackbar.success("Estado de mesa actualizado.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo cambiar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const refreshPosTableFromBackend = async (mesaId) => {
    try {
      const m = await backofficeApi.getMesa(mesaId);
      if (m) setPosTable(mapTable(m, 0));
    } catch {
      /* ignore */
    }
  };

  const handleReservarMesa = async () => {
    if (!posTable || posOrderId) return;
    if (normalizeMesaEstado(posTable.status) !== "Libre") return;
    setPosActionBusy(true);
    setError("");
    try {
      await backofficeApi.patchMesaEstado(posTable.id, "Reservada");
      await loadTables();
      await refreshPosTableFromBackend(posTable.id);
      snackbar.success("Mesa reservada.");
    } catch (e) {
      const msg = e?.message || "No se pudo reservar la mesa.";
      snackbar.error(msg);
    } finally {
      setPosActionBusy(false);
    }
  };

  const handleLiberarReserva = async () => {
    if (!posTable || posOrderId) return;
    if (!mesaEsReservada(posTable)) return;
    setPosActionBusy(true);
    setError("");
    try {
      await backofficeApi.patchMesaEstado(posTable.id, "Libre");
      await loadTables();
      await refreshPosTableFromBackend(posTable.id);
      snackbar.success("Reserva quitada; mesa libre.");
    } catch (e) {
      const msg = e?.message || "No se pudo quitar la reserva.";
      snackbar.error(msg);
    } finally {
      setPosActionBusy(false);
    }
  };

  const removeTable = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteMesa(id);
      await loadTables();
      snackbar.success("Mesa eliminada/desactivada.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo eliminar la mesa.");
    } finally {
      setSaving(false);
    }
  };

  const _openDetail = async (table) => {
    setSelectedTable(table);
    setDetailOpen(true);
    setActiveOrder(null);
    try {
      const order = await backofficeApi.getMesaOrdenActiva(table.id);
      setActiveOrder(order || null);
    } catch {
      setActiveOrder(null);
    }
  };

  const openPosView = async (table) => {
    const abiertaAhora = await syncCajaEstado();
    if (!abiertaAhora) {
      snackbar.info("Caja cerrada: no se puede abrir POS en mesas.");
      return;
    }
    posSyncChainRef.current = Promise.resolve();
    posSyncPendingCountRef.current = 0;
    setPosOpen(true);
    setPosTable(table);
    setActiveTableMenu(null);
    setPosOrderId(null);
    setPosCommitted(false);
    setPosLoading(true);
    setPosSearch("");
    setPosCategory("");
    setPosCart([]);
    setPosMobileTab("products");
    setPosInlineOpcionesProduct(null);
    setPosOpcionesModal({ open: false, product: null });
    try {
      const [orderActiva, catalog] = await Promise.all([
        backofficeApi.getMesaOrdenActiva(table.id).catch(() => null),
        fetchPosProductosYCategorias(backofficeApi, PAGINATION.POS_PRODUCTOS),
      ]);
      const orderActive = unwrapEnvelope(orderActiva);
      setPosOrderId(getOrdenPedidoId(orderActive, null));

      // Si ya hay productos agregados en backend para esta mesa,
      // sincronizamos la UI para que no se "pierdan" al volver a entrar al POS.
      const backendItems = getOrdenItems(orderActive);
      if (backendItems) {
        setPosCart(mapBackendItemsToCart(backendItems));
        setPosCommitted(true);
      } else {
        setPosCart([]);
        setPosCommitted(false);
      }

      setPosProducts(catalog.products);
      setPosCategories(catalog.categories);
    } catch (e) {
      snackbar.error(e.message || "No se pudo cargar productos para la mesa.");
    } finally {
      setPosLoading(false);
    }
  };

  const zones = useMemo(() => {
    const grouped = new Map();
    tables.forEach((t) => {
      const zone = String(t.zone || "SALON").trim() || "SALON";
      if (!grouped.has(zone)) grouped.set(zone, []);
      grouped.get(zone).push(t);
    });
    return Array.from(grouped.entries()).map(([name, items]) => ({ name, items }));
  }, [tables]);

  const mesasPlanoList = useMemo(() => {
    return [...tables].sort((a, b) => {
      const z = String(a.zone || "").localeCompare(String(b.zone || ""), "es");
      if (z !== 0) return z;
      return String(a.displayId || "").localeCompare(String(b.displayId || ""), "es", { numeric: true });
    });
  }, [tables]);

  const mesasVistaExpandida = mesasLayoutMode === "plano";

  const mesaStats = useMemo(() => {
    let libres = 0;
    let ocupadas = 0;
    let reservadas = 0;
    for (const t of tables) {
      if (mesaEsOcupadaVisual(t)) ocupadas += 1;
      else if (mesaEsReservada(t)) reservadas += 1;
      else libres += 1;
    }
    return { libres, ocupadas, reservadas };
  }, [tables]);

  const filteredPosProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return posProducts.filter((p) => {
      const categoryMatch = !posCategory || String(p.categoriaProductoId || "") === String(posCategory);
      if (!categoryMatch) return false;
      if (!q) return true;
      return `${p.nombre || ""} ${p.codigo || ""}`.toLowerCase().includes(q);
    });
  }, [posProducts, posCategory, posSearch]);

  const posInlineOpcionesPick = useMemo(
    () => (posInlineOpcionesProduct ? getSingleGrupoOpcionesForPosInline(posInlineOpcionesProduct) : null),
    [posInlineOpcionesProduct]
  );

  useEffect(() => {
    if (posInlineOpcionesProduct && !posInlineOpcionesPick) {
      setPosInlineOpcionesProduct(null);
    }
  }, [posInlineOpcionesProduct, posInlineOpcionesPick]);

  const posProductGridClassMobile =
    "grid auto-rows-min grid-cols-2 gap-2 overflow-auto content-start items-stretch sm:grid-cols-3";
  const posProductGridClassDesktop =
    "grid auto-rows-min grid-cols-2 gap-2 overflow-auto content-start items-stretch sm:grid-cols-3";
  /** Sub-opciones de un producto (sin imagen). Mismo gradiente que `PosProductCatalogTile` sin imagen. */
  const posOpcionTileShell =
    "flex min-h-[96px] w-full flex-col justify-end gap-0.5 rounded-lg border border-slate-200/90 bg-gradient-to-b from-slate-200 to-slate-500 px-2.5 py-2.5 text-left text-[10px] font-bold leading-tight text-white shadow sm:min-h-[104px] [text-shadow:0_0_6px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.08),0_0_1px_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60";

  const rollbackPosLineByLineId = (lineId, cantidad) => {
    if (lineId == null || lineId === "") return;
    setPosCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.lineId === lineId);
      if (idx < 0) return prev;
      const currentQty = Number(next[idx].qty || 0);
      const newQty = Math.max(0, currentQty - Number(cantidad || 1));
      if (newQty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  };

  const syncPosDeltaAdd = (product, cantidad = 1, opcionesSeleccionadas = [], notas = "", rollbackLineId = null) => {
    if (!posTable) return;
    if (!cajaAbierta) return;
    if (posActionBusy) return;

    const opsNorm = normalizeOpcionesSeleccionadas(opcionesSeleccionadas);
    const notasTrim = String(notas ?? "").trim();

    posSyncPendingCountRef.current += 1;
    posSyncChainRef.current = posSyncChainRef.current
      .then(async () => {
        const currentId = posOrderIdRef.current;
        const pid = Number(product?.id ?? product?.Id);
        const line = withOpcionesNormalizadas({ productoId: pid, cantidad, notas: notasTrim }, opsNorm);
        const body = {
          mesaId: Number(posTable.id),
          ordenId: currentId ?? undefined,
          observaciones: "",
          productos: [line],
        };
        try {
          const data = await backofficeApi.posOrdenes(body);
          const newOrderId = extractPosOrdenResponseId(data, currentId);

          if (newOrderId && newOrderId !== posOrderIdRef.current) {
            setPosOrderId(newOrderId);
          }

          setPosCommitted(true);
          await loadTables();
          try {
            await backofficeApi.patchMesaEstado(Number(posTable.id), "Ocupada");
          } catch {
            /* el backend puede haberla marcado ya */
          }
          await refreshPosTableFromBackend(posTable.id);
        } catch (e) {
          rollbackPosLineByLineId(rollbackLineId, cantidad);
          const msg = e?.message || "No se pudo agregar el producto en backend.";
          const status = e?.status;
          const normalized = normalizeApiErrorMessage(msg);
          const cajaCerrada = isCajaCerradaMessageNormalized(normalized);
          if (cajaCerrada) {
            setCajaAbierta(false);
            await syncCajaEstado();
          }
          const stockConflict = isStockShortageConflict409(status, normalized, cajaCerrada);
          snackbar.error(stockConflict && !/^stock\b/i.test(msg) ? `Stock: ${msg}` : msg);
        }
      })
      .catch(() => {})
      .finally(() => {
        posSyncPendingCountRef.current = Math.max(0, posSyncPendingCountRef.current - 1);
      });

    void posSyncChainRef.current;
  };

  const addProductToCart = async (product) => {
    if (!cajaAbierta) {
      const abiertaAhora = await syncCajaEstado();
      if (!abiertaAhora) {
        snackbar.info("Caja cerrada: no se puede agregar productos.");
        return;
      }
    }
    if (productoTieneOpcionesVisibles(product)) {
      if (getSingleGrupoOpcionesForPosInline(product)) {
        setPosInlineOpcionesProduct(product);
        return;
      }
      setPosOpcionesModal({ open: true, product });
      return;
    }
    const pid = Number(product?.id ?? product?.Id);
    const emptyKey = "";
    const mergeTarget = posLineMergeKey([], "");
    const syncPayloadRef = { current: { ops: [], notas: "", rollbackLineId: null } };

    setPosCart((prev) => {
      const idx = prev.findIndex(
        (x) => Number(x.id) === pid && posLineMergeKey(x.opcionesSeleccionadas, x.notas) === mergeTarget
      );
      if (idx >= 0) {
        const line = prev[idx];
        syncPayloadRef.current = {
          ops: normalizeOpcionesSeleccionadas(line.opcionesSeleccionadas),
          notas: String(line.notas ?? "").trim(),
          rollbackLineId: line.lineId,
        };
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      const nextLineId = genPosLineId();
      syncPayloadRef.current = { ops: [], notas: "", rollbackLineId: nextLineId };
      return [
        ...prev,
        {
          lineId: nextLineId,
          id: pid,
          name: product.nombre || product.Nombre || "Producto",
          price: Number(product.precio ?? product.Precio ?? 0),
          qty: 1,
          opcionesSeleccionadas: [],
          opcionesKey: emptyKey,
          opcionesResumen: "",
          notas: "",
        },
      ];
    });

    const { ops, notas, rollbackLineId } = syncPayloadRef.current;
    void syncPosDeltaAdd(product, 1, ops, notas, rollbackLineId);
  };

  const pickPosInlineOpcion = (prod, grupoId, opcion) => {
    const oid = Number(opcion?.id ?? opcion?.Id);
    if (!Number.isFinite(oid) || !Number.isFinite(Number(grupoId))) return;
    if (posActionBusy || !cajaAbierta) return;
    setPosInlineOpcionesProduct(null);
    confirmAddProductWithOpciones(prod, [{ grupoId: Number(grupoId), opcionId: oid }]);
  };

  const confirmAddProductWithOpciones = (product, opcionesSeleccionadas) => {
    const pid = Number(product?.id ?? product?.Id);
    const grupos = normalizeOpcionesGrupos(product);
    const opsNorm = normalizeOpcionesSeleccionadas(opcionesSeleccionadas);
    const key = opcionesSeleccionadasKey(opsNorm);
    const extra = sumarPrecioAdicionalOpciones(grupos, opsNorm);
    const base = Number(product.precio ?? product.Precio ?? 0);
    const resumen = buildOpcionesResumenLocal(grupos, opsNorm);
    const mergeTarget = posLineMergeKey(opsNorm, "");
    const syncPayloadRef = { current: { ops: opsNorm, notas: "", rollbackLineId: null } };

    setPosCart((prev) => {
      const idx = prev.findIndex(
        (x) => Number(x.id) === pid && posLineMergeKey(x.opcionesSeleccionadas, x.notas) === mergeTarget
      );
      if (idx >= 0) {
        const line = prev[idx];
        syncPayloadRef.current = {
          ops: normalizeOpcionesSeleccionadas(line.opcionesSeleccionadas),
          notas: String(line.notas ?? "").trim(),
          rollbackLineId: line.lineId,
        };
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      const nextLineId = genPosLineId();
      syncPayloadRef.current = { ops: opsNorm, notas: "", rollbackLineId: nextLineId };
      return [
        ...prev,
        {
          lineId: nextLineId,
          id: pid,
          name: product.nombre || product.Nombre || "Producto",
          price: base + extra,
          qty: 1,
          opcionesSeleccionadas: opsNorm,
          opcionesKey: key,
          opcionesResumen: resumen,
          notas: "",
        },
      ];
    });

    const { ops, notas, rollbackLineId } = syncPayloadRef.current;
    void syncPosDeltaAdd(product, 1, ops, notas, rollbackLineId);
  };

  const syncPosCartSnapshot = (nextCart) => {
    if (!posTable) return;
    const snapshot = Array.isArray(nextCart) ? nextCart : [];

    posSyncPendingCountRef.current += 1;
    posSyncChainRef.current = posSyncChainRef.current
      .then(async () => {
        let currentId = posOrderIdRef.current;

        // Si no existe orden todavía y no hay items, no hay nada que persistir.
        if (!currentId && snapshot.length === 0) {
          setPosCommitted(true);
          return;
        }

        // Crea orden activa solo si hay items locales que persistir.
        if (!currentId && snapshot.length > 0) {
          const productos = posCartToPosOrdenProductos(snapshot);
          const data = await backofficeApi.posOrdenes({
            mesaId: Number(posTable.id),
            ordenId: undefined,
            observaciones: "",
            productos,
          });
          const newOrderId = extractPosOrdenResponseId(data, null);
          if (!newOrderId) throw new Error("No se pudo crear la orden activa en backend.");
          currentId = newOrderId;
          setPosOrderId(newOrderId);
        }

        if (!currentId) {
          setPosCommitted(true);
          return;
        }

        const pedido = await backofficeApi.getPedido(currentId);
        const items = posCartToPedidoItemsPayload(snapshot);

        const updateResp = await backofficeApi.updatePedido(currentId, {
          mesaId: pedido?.mesaId ?? pedido?.MesaId ?? Number(posTable.id),
          clienteId: pedido?.clienteId ?? pedido?.ClienteId ?? null,
          meseroId: pedido?.meseroId ?? pedido?.MeseroId ?? null,
          estado: pedido?.estado ?? pedido?.Estado ?? "Listo",
          estadoCocina: pedido?.estadoCocina ?? pedido?.EstadoCocina ?? "Listo",
          observaciones: pedido?.observaciones ?? pedido?.Observaciones ?? null,
          items,
        });

        const vacio = Boolean(updateResp?.vacio ?? updateResp?.Vacio);
        if (vacio) {
          setPosOrderId(null);
          setPosCart([]);
          await loadTables();
          await refreshPosTableFromBackend(posTable.id);
          setPosCommitted(true);
          return;
        }

        setPosCommitted(true);
      })
      .catch(async (e) => {
        const msg = e?.message || "No se pudo actualizar la orden.";
        snackbar.error(msg);
        if (!posTable) return;
        try {
          const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id);
          const fresh = unwrapEnvelope(freshRaw);
          const backendItems = getOrdenItems(fresh);
          setPosCart(backendItems ? mapBackendItemsToCart(backendItems) : []);
          setPosCommitted(true);
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        posSyncPendingCountRef.current = Math.max(0, posSyncPendingCountRef.current - 1);
      });

    void posSyncChainRef.current;
  };

  const updateCartQty = (lineId, delta) => {
    let nextCart = [];
    setPosCart((prev) => {
      const next = prev
        .map((item) =>
          item.lineId === lineId ? { ...item, qty: Math.max(0, Number(item.qty || 0) + delta) } : item
        )
        .filter((item) => item.qty > 0);
      nextCart = next;
      return next;
    });
    setPosCommitted(false);
    syncPosCartSnapshot(nextCart);
  };

  const removeFromCart = (lineId) => {
    let nextCart = [];
    setPosCart((prev) => {
      const next = prev.filter((item) => item.lineId !== lineId);
      nextCart = next;
      return next;
    });
    setPosCommitted(false);
    syncPosCartSnapshot(nextCart);
  };

  const updateCartNotas = (lineId, notas) => {
    setPosCart((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, notas: String(notas ?? "") } : item))
    );
    setPosCommitted(false);
  };

  const posSubtotal = useMemo(() => posCart.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.qty || 0), 0), [posCart]);

  useEffect(() => {
    posOrderIdRef.current = posOrderId;
  }, [posOrderId]);

  useEffect(() => {
    posCartRef.current = posCart;
  }, [posCart]);

  const closePosView = () => {
    posSyncChainRef.current = Promise.resolve();
    posSyncPendingCountRef.current = 0;
    setPosOpcionesModal({ open: false, product: null });
    setPosInlineOpcionesProduct(null);
    setPosOpen(false);
    setPosTable(null);
    setPosOrderId(null);
    setPosCommitted(false);
    setPosCart([]);
    setPosSearch("");
    setPosCategory("");
    setPosMobileTab("products");
    setSaleModalOpen(false);
    setSaleOrdenId(null);
    setSaleModalLines([]);
    setSaleBackendTotal(null);
    setPosCancelPinOpen(false);
    // Refresca el listado de mesas para que se vea el cambio de estado (rojo/ocupada).
    loadTables();
  };

  const openMoveOrderDialog = async () => {
    if (!posTable) return;
    const oid = posOrderId ?? posOrderIdRef.current;
    if (!oid) {
      snackbar.info("No hay un pedido activo para trasladar.");
      return;
    }
    setError("");
    if (posCart.length > 0) {
      try {
        await ensurePosOrderSynced();
      } catch {
        return;
      }
    }
    try {
      const data = await backofficeApi.listMesas({ page: 1, pageSize: PAGINATION.LIST_LARGE });
      const raw = data?.items || [];
      const mapped = raw.map(mapTable);
      const free = mapped.filter((t) => t.id !== posTable.id && t.status === "Libre");
      if (free.length === 0) {
        snackbar.info("No hay mesas libres. Libera una mesa o elige otra estrategia.");
        return;
      }
      setMoveOrderCandidates(free);
      setMoveOrderTargetId(String(free[0].id));
      setMoveOrderOpen(true);
    } catch (e) {
      const msg = e?.message || "No se pudo cargar mesas para el traslado.";
      snackbar.error(msg);
    }
  };

  const handleConfirmTrasladarPedido = async (e) => {
    e.preventDefault();
    if (!posTable) return;
    const destId = Number(moveOrderTargetId);
    const oid = posOrderId ?? posOrderIdRef.current;
    if (!oid || !Number.isFinite(destId) || destId === posTable.id) {
      snackbar.error("Selecciona una mesa destino válida.");
      return;
    }

    setPosActionBusy(true);
    setError("");
    try {
      if (posCart.length > 0) {
        await ensurePosOrderSynced();
      }

      const orderId = posOrderId ?? posOrderIdRef.current;
      if (!orderId) throw new Error("No se encontró el pedido activo.");

      let trasladarMessage = "";
      try {
        const env = await backofficeApi.pedidoTrasladarMesa(orderId, destId);
        trasladarMessage = (env?.message || "").trim();
      } catch (err) {
        const st = err?.status;
        if (st !== 404 && st !== 405) throw err;
        const pedido = await backofficeApi.getPedido(orderId);
        const body = buildUpdatePedidoPayloadForMesaChange(pedido, destId);
        await backofficeApi.updatePedido(orderId, body);
      }

      const [, mesaRes, rawOrden] = await Promise.all([
        loadTables(),
        backofficeApi.getMesa(destId).catch(() => null),
        backofficeApi.getMesaOrdenActiva(destId).catch(() => null),
      ]);

      let newTable;
      if (mesaRes) {
        newTable = mapTable(mesaRes, 0);
      } else {
        const fromList = moveOrderCandidates.find((t) => t.id === destId);
        if (!fromList) throw new Error("No se pudo cargar la mesa destino.");
        newTable = fromList;
      }

      const orderActive = unwrapEnvelope(rawOrden);
      const nextId = getOrdenPedidoId(orderActive, orderId);
      const backendItems = getOrdenItems(orderActive);
      let nextCart = posCartRef.current;
      if (backendItems?.length) {
        nextCart = mapBackendItemsToCart(backendItems);
      } else {
        try {
          const p = await backofficeApi.getPedido(nextId ?? orderId);
          const its = p?.items ?? p?.Items;
          if (its?.length) nextCart = mapBackendItemsToCart(its);
        } catch {
          /* mantiene carrito actual */
        }
      }

      // Un solo bloque de estado: evita un frame con mesa nueva y carrito/pedido desalineados
      // (el efecto de carrito vacío podía dispararse mal en ese intervalo).
      setPosTable(newTable);
      setPosOrderId(nextId);
      setPosCart(nextCart);
      setPosMobileTab("order");
      setPosCommitted(true);
      setMoveOrderOpen(false);
      setMoveOrderCandidates([]);
      setMoveOrderTargetId("");
      snackbar.success(
        trasladarMessage || `Pedido trasladado a ${newTable.zone} · ${newTable.displayId}.`
      );
    } catch (err) {
      const msg = err?.message || "No se pudo trasladar el pedido.";
      snackbar.error(msg);
    } finally {
      setPosActionBusy(false);
    }
  };

  const openPreCuentaPrint = ({ mesaLabel, zoneLabel, lines, total, currency }) => {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      snackbar.error("Permita ventanas emergentes para imprimir la cuenta.");
      return;
    }
    const sym = currency || currencySymbol;
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const rows = lines
      .map(
        (x) => `<tr>
        <td>${esc(x.name)}</td>
        <td style="text-align:center">${esc(x.qty)}</td>
        <td style="text-align:right">${esc(formatCurrency(x.price, sym))}</td>
        <td style="text-align:right">${esc(formatCurrency(x.lineTotal ?? Number(x.price || 0) * Number(x.qty || 0), sym))}</td>
      </tr>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pre-cuenta</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:16px;max-width:640px;margin:0 auto;color:#111}
        h1{font-size:18px;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border-bottom:1px solid #ddd;padding:6px 4px}
        th{text-align:left;background:#f5f5f5}
        .totals{margin-top:12px;text-align:right;font-size:14px}
      </style></head><body>
      <h1>Pre-cuenta</h1>
      <div class="sub">${esc(zoneLabel)} · ${esc(mesaLabel)}</div>
      <table><thead><tr><th>Producto</th><th>Cant.</th><th>P.U</th><th>P.T</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><strong>Total ${esc(formatCurrency(total, sym))}</strong></div>
      <p style="font-size:11px;color:#666;margin-top:16px">Vista informativa. El comprobante oficial se emite al registrar el pago.</p>
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      try {
        w.print();
      } finally {
        w.close();
      }
    };
  };

  const ensurePosOrderSynced = async () => {
    if (!posTable) return posOrderId;
    if (posActionBusy) return posOrderId;

    await posSyncChainRef.current.catch(() => {});

    setPosActionBusy(true);
    setError("");
    try {
      // Aseguramos que exista la orden activa (si por algún motivo no existe aún).
      if (!posOrderId && posCart.length > 0) {
        const productos = posCartToPosOrdenProductos(posCart);
        const data = await backofficeApi.posOrdenes({
          mesaId: Number(posTable.id),
          ordenId: undefined,
          observaciones: "",
          productos,
        });
        const newOrderId = extractPosOrdenResponseId(data, null);
        if (!newOrderId) throw new Error("No se pudo crear la orden activa en backend.");
        setPosOrderId(newOrderId);
      }

      const currentId = posOrderId ?? posOrderIdRef.current;
      if (!currentId) {
        setPosCommitted(true);
        return null;
      }

      // PUT reemplaza items: así queda 1:1 con el carrito (incluye +/-).
      const pedido = await backofficeApi.getPedido(currentId);
      const items = posCartToPedidoItemsPayload(posCart);

      const updateResp = await backofficeApi.updatePedido(currentId, {
        mesaId: pedido?.mesaId ?? pedido?.MesaId ?? Number(posTable.id),
        clienteId: pedido?.clienteId ?? pedido?.ClienteId ?? null,
        meseroId: pedido?.meseroId ?? pedido?.MeseroId ?? null,
        estado: pedido?.estado ?? pedido?.Estado ?? "Listo",
        estadoCocina: pedido?.estadoCocina ?? pedido?.EstadoCocina ?? "Listo",
        observaciones: pedido?.observaciones ?? pedido?.Observaciones ?? null,
        items,
      });

      const vacio = Boolean(updateResp?.vacio ?? updateResp?.Vacio);
      if (vacio) {
        setPosOrderId(null);
        setPosCart([]);
        setPosCommitted(true);
        await loadTables();
        await refreshPosTableFromBackend(posTable.id);
        return null;
      }

      const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
      const fresh = unwrapEnvelope(freshRaw);
      const backendItems = getOrdenItems(fresh);
      if (backendItems) setPosCart(mapBackendItemsToCart(backendItems));
      else setPosCart([]);

      setPosCommitted(true);
      await loadTables();
      if (posCart.length > 0) {
        try {
          await backofficeApi.patchMesaEstado(Number(posTable.id), "Ocupada");
        } catch {
          /* puede ya estar ocupada */
        }
      }
      await refreshPosTableFromBackend(posTable.id);
      return currentId;
    } catch (e) {
      const msg = e?.message || "No se pudo enviar la orden.";
      const status = e?.status;
      const normalized = normalizeApiErrorMessage(msg);
      const stockConflict = isStockShortageConflict409(status, normalized, false);
      if (status === 409 && posTable) {
        try {
          const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id);
          const fresh = unwrapEnvelope(freshRaw);
          const backendItems = getOrdenItems(fresh);
          if (backendItems) setPosCart(mapBackendItemsToCart(backendItems));
        } catch {
          /* ignore */
        }
      }
      snackbar.error(stockConflict && !/^stock\b/i.test(msg) ? `Stock: ${msg}` : msg);
      throw e;
    } finally {
      setPosActionBusy(false);
    }
  };

  const openCancelPosPin = () => {
    if (!posTable || posActionBusy) return;
    if (!posOrderId) {
      snackbar.info("No había una orden activa para cancelar.");
      return;
    }
    setPosCancelPinOpen(true);
  };

  const executePosCancelarConPin = async (codigo) => {
    if (!posTable || !posOrderId) throw new Error("No hay orden para cancelar.");
    setPosActionBusy(true);
    setError("");
    try {
      await backofficeApi.posCancelarOrden(posOrderId, codigo);
      snackbar.success("Pedido cancelado y mesa liberada.");
      setPosCancelPinOpen(false);
      closePosView();
      await loadTables();
    } finally {
      setPosActionBusy(false);
    }
  };

  const handleEnviarCocina = async () => {
    if (!posTable) return;
    if (posActionBusy) return;
    try {
      if (posCart.length > 0) await ensurePosOrderSynced();
      if (!posOrderId) throw new Error("No hay orden activa para enviar a cocina.");

      // Si la orden ya existía (posCart vacío), cargamos items para mantener UI sincronizada.
      if (!posCommitted && posCart.length === 0) {
        const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
        const fresh = unwrapEnvelope(freshRaw);
        const items = getOrdenItems(fresh);
        if (items) setPosCart(mapBackendItemsToCart(items));
        setPosCommitted(true);
      }

      // Para que "Enviar cocina" haga algo real, sincronizamos el EstadoCocina.
      const freshRaw2 = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
      const fresh2 = unwrapEnvelope(freshRaw2);
      const estadoCocinaActual = getEstadoCocinaOrden(fresh2);

      // Si ya está "Listo", mantenemos. Si está "Pendiente", lo movemos a "En Preparación".
      const nextEstadoCocina = estadoCocinaActual === "Pendiente" ? "En Preparación" : "Listo";
      await backofficeApi.cocinaOrdenEstado(posOrderId, nextEstadoCocina);

      snackbar.success("Orden enviada a cocina.");
      setPosMobileTab("order");
    } catch (e) {
      const msg = e?.message || "No se pudo enviar a cocina.";
      snackbar.error(msg);
    }
  };

  const openProcesarVentaModal = async () => {
    if (!posTable) return;
    if (posActionBusy || saleProcessing) return;
    setError("");
    try {
      if (posCart.length > 0) await ensurePosOrderSynced();

      let ordenId = posOrderId ?? posOrderIdRef.current;
      let lines = posCartToModalLines(posCart);

      if (lines.length === 0) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = unwrapEnvelope(raw);
        if (!order) throw new Error("No hay orden activa para cobrar.");
        ordenId = getOrdenPedidoId(order, ordenId);
        const backendItems = getOrdenItems(order);
        if (!backendItems?.length) throw new Error("La orden no tiene productos.");
        lines = posCartToModalLines(mapBackendItemsToCart(backendItems));
      }

      if (!ordenId) throw new Error("No hay orden activa para cobrar.");

      let totalBackend = null;
      try {
        const pedido = await backofficeApi.getPedido(ordenId);
        totalBackend = getPedidoMontoNumeric(pedido);
      } catch {
        /* ignore */
      }

      setSaleModalLines(lines);
      setSaleBackendTotal(totalBackend);
      setSaleOrdenId(ordenId);
      setSaleModalOpen(true);
    } catch (e) {
      const msg = e?.message || "No se pudo abrir cobro.";
      snackbar.error(msg);
    }
  };

  const handleGuardarVenta = async (form) => {
    if (!posTable || !saleOrdenId) return;
    if (saleProcessingGuardRef.current) return;
    saleProcessingGuardRef.current = true;
    setSaleProcessing(true);
    setError("");
    try {
      const payload = buildPagoPayload({
        ordenId: saleOrdenId,
        form,
        defaultObservaciones: "Pago POS",
      });

      let resp;
      try {
        resp = await backofficeApi.ventasGestionarPago(payload);
      } catch {
        resp = await backofficeApi.ventasProcesarPago(payload);
      }

      const url = resp?.urlImpresionRecibo ?? resp?.UrlImpresionRecibo ?? resp?.url ?? resp?.Url;
      const html =
        resp?.htmlImpresionRecibo ??
        resp?.HtmlImpresionRecibo ??
        resp?.htmlPrecuenta ??
        resp?.HtmlPrecuenta ??
        null;

      // Preferimos iframe oculto para evitar que el navegador abra otra pestaña.
      if (html && typeof html === "string") {
        const ok = await openBackendPrintHtml(html);
        if (!ok) snackbar.error("No se pudo imprimir el recibo.");
      } else if (url) {
        const ok = await openBackendPrintUrl(url);
        if (!ok) snackbar.error("No se pudo imprimir el recibo.");
      }

      snackbar.success("Venta procesada.");
      window.dispatchEvent(new CustomEvent("barrest-inventory-updated"));
      setSaleModalOpen(false);
      setSaleOrdenId(null);
      setSaleModalLines([]);
      setSaleBackendTotal(null);
      closePosView();
      await loadTables();
    } catch (e) {
      const msg = e?.message || "No se pudo registrar el pago.";
      snackbar.error(msg);
    } finally {
      setSaleProcessing(false);
      saleProcessingGuardRef.current = false;
    }
  };

  const handleImprimirCuenta = async () => {
    if (!posTable) return;
    if (posActionBusy || saleProcessing) return;
    setError("");
    try {
      if (posCart.length > 0) await ensurePosOrderSynced();
      let ordenId = posOrderId ?? posOrderIdRef.current;

      if (!ordenId) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = unwrapEnvelope(raw);
        if (!order) throw new Error("No hay orden para imprimir.");
        ordenId = getOrdenPedidoId(order, null);
      }
      if (!ordenId) throw new Error("No se encontró el ID de la orden.");

      // Flujo oficial backend: pre-cuenta sin pagar.
      const pre = await backofficeApi.pedidoPrecuenta(ordenId);
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

      if (htmlPrecuenta && (await openBackendPrintHtml(htmlPrecuenta))) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }

      // Fallback oficial: endpoint HTML directo.
      try {
        const rawHtml = await backofficeApi.pedidoPrecuentaHtml(ordenId);
        const htmlDirect = typeof rawHtml === "string" ? rawHtml : rawHtml?.html ?? rawHtml?.Html ?? null;
        if (htmlDirect && (await openBackendPrintHtml(htmlDirect))) {
          snackbar.info("Pre-cuenta lista para imprimir.");
          return;
        }
      } catch {
        /* continue to local fallback */
      }

      let lines = posCartToModalLines(posCart);

      if (lines.length === 0) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = unwrapEnvelope(raw);
        if (!order) throw new Error("No hay orden para imprimir.");
        const backendItems = getOrdenItems(order);
        if (!backendItems?.length) throw new Error("No hay productos en la orden.");
        lines = posCartToModalLines(mapBackendItemsToCart(backendItems));
      }

      let total = lines.reduce((s, x) => s + x.lineTotal, 0);
      const oid = posOrderId ?? posOrderIdRef.current;
      if (oid) {
        try {
          const pedido = await backofficeApi.getPedido(oid);
          const m = getPedidoMontoNumeric(pedido);
          if (m != null) total = m;
        } catch {
          /* ignore */
        }
      }

      openPreCuentaPrint({
        mesaLabel: posTable.displayId,
        zoneLabel: posTable.zone,
        lines,
        total,
        currency: currencySymbol,
      });
      snackbar.info("Pre-cuenta lista para imprimir (modo local).");
    } catch (e) {
      const msg = e?.message || "No se pudo imprimir la cuenta.";
      snackbar.error(msg);
    }
  };

  useEffect(() => {
    if (typeof onPosOpenChange === "function") onPosOpenChange(posOpen);
  }, [onPosOpenChange, posOpen]);

  useEffect(() => {
    if (!activeTableMenu) return;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (t?.closest?.("[data-table-menu-trigger]")) return;
      if (t?.closest?.("[data-table-menu]")) return;
      setActiveTableMenu(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [activeTableMenu]);

  if (loading) {
    return <BackofficeStatCardsListSkeleton listRows={5} />;
  }

  if (posOpen && posTable) {
    return (
      <>
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-sm lg:h-[calc(100vh-10.5rem)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800">
                {String(posTable.zone || "").toUpperCase()} | {posTable.displayId}
              </h2>
              {mesaEsReservada(posTable) && !posOrderId ? (
                <p className="mt-0.5 text-xs text-violet-800">
                  Mesa <strong>reservada</strong>. Agrega productos a la orden para pasarla a <strong className="text-rose-700">ocupada</strong>.
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">Selecciona productos para esta mesa.</p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
              {!posOrderId && normalizeMesaEstado(posTable.status) === "Libre" && (
                <button
                  type="button"
                  onClick={() => void handleReservarMesa()}
                  disabled={posActionBusy || !cajaAbierta}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-800 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bookmark className="h-3.5 w-3.5 shrink-0" />
                  Reservar mesa
                </button>
              )}
              {!posOrderId && mesaEsReservada(posTable) && (
                <button
                  type="button"
                  onClick={() => void handleLiberarReserva()}
                  disabled={posActionBusy || !cajaAbierta}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Quitar reserva
                </button>
              )}
              {posOrderId && (
                <button
                  type="button"
                  onClick={() => void openMoveOrderDialog()}
                  disabled={posActionBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                  Trasladar pedido
                </button>
              )}
              <button
                type="button"
                onClick={closePosView}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a mesas
              </button>
            </div>
          </div>

          <div className="mb-3 overflow-x-auto rounded-md border border-slate-200 bg-white p-2">
            <div className="flex w-max min-w-full gap-1.5">
              <button
                type="button"
                onClick={() => setPosCategory("")}
                className={`whitespace-nowrap rounded-sm px-4 py-1.5 text-[11px] font-semibold ${!posCategory ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"}`}
              >
                TODOS
              </button>
              {posCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPosCategory(String(c.id))}
                  className={`whitespace-nowrap rounded-sm px-4 py-1.5 text-[11px] font-semibold ${String(posCategory) === String(c.id) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}
                >
                  {(c.nombre || c.descripcion || "Categoria").toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setPosMobileTab("products")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                posMobileTab === "products" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              Productos
            </button>
            <button
              type="button"
              onClick={() => setPosMobileTab("order")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                posMobileTab === "order" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              Orden ({posCart.length})
            </button>
          </div>

          <div className="min-h-0 flex-1 lg:hidden">
            {posMobileTab === "products" ? (
              <article className="h-full rounded-md border border-slate-300 bg-white p-3">
                {posInlineOpcionesPick && posInlineOpcionesProduct ? (
                  <PosInlineOpcionesPanel
                    product={posInlineOpcionesProduct}
                    grupoId={posInlineOpcionesPick.grupoId}
                    opciones={posInlineOpcionesPick.opciones}
                    onPickOpcion={pickPosInlineOpcion}
                    onBack={() => setPosInlineOpcionesProduct(null)}
                    currencySymbol={currencySymbol}
                    disabled={posActionBusy || !cajaAbierta}
                    gridClassName={`max-h-[55vh] ${posProductGridClassMobile}`}
                    tileClassName={posOpcionTileShell}
                  />
                ) : (
                  <>
                    <input
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder="Búsqueda de productos"
                      className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {posLoading ? (
                      <ListSkeleton rows={4} />
                    ) : (
                      <div className={`max-h-[55vh] ${posProductGridClassMobile}`}>
                        {filteredPosProducts.map((p) => (
                          <PosProductCatalogTile
                            key={p.id}
                            product={p}
                            onClick={() => addProductToCart(p)}
                            disabled={posActionBusy || !cajaAbierta}
                          />
                        ))}
                        {filteredPosProducts.length === 0 && (
                          <p className="col-span-2 py-8 text-center text-xs text-slate-500">Sin productos para mostrar.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            ) : (
              <article className="flex h-full min-h-[52vh] flex-col rounded-md border border-slate-300 bg-white p-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Orden</h3>
                <div className="min-h-0 flex-1 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
                  {posLoading ? (
                    <ListSkeleton rows={6} />
                  ) : (
                    <>
                      {posCart.length === 0 && <p className="py-8 text-center text-xs text-slate-500">Sin productos en la orden.</p>}
                      {posCart.map((item) => (
                        <div key={item.lineId} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                              {item.opcionesResumen ? (
                                <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{item.opcionesResumen}</p>
                              ) : null}
                              <input
                                type="text"
                                value={item.notas ?? ""}
                                onChange={(e) => updateCartNotas(item.lineId, e.target.value)}
                                disabled={posActionBusy}
                                placeholder="Nota adicional"
                                className="mt-1.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.lineId)}
                              disabled={posActionBusy}
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                            <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.lineId, -1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-5 text-center font-semibold text-slate-800">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.lineId, 1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span>P/U: {formatCurrency(item.price, currencySymbol)}</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(item.price * item.qty, currencySymbol)}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {posCart.length > 0 && (
                  <>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(posSubtotal, currencySymbol)}</span></div>
                      <div className="flex justify-between"><span>Total</span><span className="font-bold">{formatCurrency(posSubtotal, currencySymbol)}</span></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
                      <button type="button" onClick={openCancelPosPin} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-red-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                      <button type="button" onClick={handleImprimirCuenta} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-sky-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir cuenta
                      </button>
                      <button type="button" onClick={handleEnviarCocina} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-amber-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                        <ChefHat className="h-3.5 w-3.5" />
                        Enviar cocina
                      </button>
                      <button type="button" onClick={openProcesarVentaModal} disabled={posActionBusy || saleProcessing} className="inline-flex items-center justify-center gap-1 rounded-sm bg-emerald-600 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                        <Save className="h-3.5 w-3.5" />
                        Procesar orden
                      </button>
                    </div>
                  </>
                )}

                {(posCart.length === 0 && posOrderId) && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
                    <button type="button" onClick={openCancelPosPin} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-red-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                    <button type="button" onClick={handleImprimirCuenta} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-sky-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir cuenta
                    </button>
                    <button type="button" onClick={handleEnviarCocina} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-amber-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                      <ChefHat className="h-3.5 w-3.5" />
                      Enviar cocina
                    </button>
                    <button type="button" onClick={openProcesarVentaModal} disabled={posActionBusy || saleProcessing} className="inline-flex items-center justify-center gap-1 rounded-sm bg-emerald-600 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                      <Save className="h-3.5 w-3.5" />
                      Procesar orden
                    </button>
                  </div>
                )}
              </article>
            )}
          </div>

          {posCart.length > 0 && posMobileTab === "products" && (
            <div className="sticky bottom-0 z-10 mt-3 flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm lg:hidden">
              <div>
                <p className="text-[11px] text-slate-500">Total</p>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(posSubtotal, currencySymbol)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPosMobileTab("order")}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Ver orden ({posCart.length})
              </button>
            </div>
          )}

          <div className="hidden min-h-0 flex-1 grid-cols-1 gap-3 lg:grid lg:grid-cols-[1.45fr_1fr]">
            <article className="flex min-h-0 h-full flex-col rounded-md border border-slate-300 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Orden</h3>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
                {posLoading ? (
                  <ListSkeleton rows={7} />
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
                      {posCart.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                            Sin productos en la orden.
                          </td>
                        </tr>
                      )}
                      {posCart.map((item) => (
                        <tr key={item.lineId} className="border-t border-slate-100">
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
                              onChange={(e) => updateCartNotas(item.lineId, e.target.value)}
                              disabled={posActionBusy}
                              placeholder="Nota adicional"
                              className="box-border w-full min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800 placeholder:text-slate-400"
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.lineId, -1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-5 text-center font-semibold text-slate-800">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.lineId, 1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-middle">
                            {formatCurrency(item.price, currencySymbol)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-middle font-semibold">
                            <div className="flex items-center justify-between gap-2">
                              <span>{formatCurrency(item.price * item.qty, currencySymbol)}</span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.lineId)}
                                disabled={posActionBusy}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-200 text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
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
              {posCart.length > 0 && (
                <div className="mt-2 ml-auto w-full max-w-[220px] space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(posSubtotal, currencySymbol)}</span></div>
                  <div className="flex justify-between"><span>Total</span><span className="font-bold">{formatCurrency(posSubtotal, currencySymbol)}</span></div>
                </div>
              )}

              {(posCart.length > 0 || posOrderId) && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-200 pt-2">
                  <button type="button" onClick={openCancelPosPin} disabled={posActionBusy} className="inline-flex items-center gap-1 rounded-sm bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
                    <XCircle className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                  <button type="button" onClick={handleImprimirCuenta} disabled={posActionBusy} className="inline-flex items-center gap-1 rounded-sm bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir cuenta
                  </button>
                  <button type="button" onClick={handleEnviarCocina} disabled={posActionBusy} className="inline-flex items-center gap-1 rounded-sm bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
                    <ChefHat className="h-3.5 w-3.5" />
                    Enviar cocina
                  </button>
                  <button type="button" onClick={openProcesarVentaModal} disabled={posActionBusy || saleProcessing} className="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" />
                    Procesar orden
                  </button>
                </div>
              )}
            </article>

            <article className="min-h-[340px] rounded-md border border-slate-300 bg-white p-3 lg:min-h-0 lg:h-full">
              {posInlineOpcionesPick && posInlineOpcionesProduct ? (
                <PosInlineOpcionesPanel
                  product={posInlineOpcionesProduct}
                  grupoId={posInlineOpcionesPick.grupoId}
                  opciones={posInlineOpcionesPick.opciones}
                  onPickOpcion={pickPosInlineOpcion}
                  onBack={() => setPosInlineOpcionesProduct(null)}
                  currencySymbol={currencySymbol}
                  disabled={posActionBusy || !cajaAbierta}
                  gridClassName={`max-h-[420px] ${posProductGridClassDesktop} lg:h-[calc(100%-5.5rem)] lg:max-h-full`}
                  tileClassName={posOpcionTileShell}
                />
              ) : (
                <>
                  <input
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Búsqueda de productos"
                    className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  {posLoading ? (
                    <ListSkeleton rows={4} />
                  ) : (
                    <div className={`max-h-[420px] ${posProductGridClassDesktop} lg:h-[calc(100%-2.5rem)] lg:max-h-full`}>
                      {filteredPosProducts.map((p) => (
                        <PosProductCatalogTile
                          key={p.id}
                          product={p}
                          onClick={() => addProductToCart(p)}
                          disabled={posActionBusy || !cajaAbierta}
                        />
                      ))}
                      {filteredPosProducts.length === 0 && (
                        <p className="col-span-2 py-8 text-center text-xs text-slate-500">Sin productos para mostrar.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </article>
          </div>
        </section>

        <PosProductOpcionesModal
          open={posOpcionesModal.open}
          product={posOpcionesModal.product}
          currencySymbol={currencySymbol}
          onClose={() => setPosOpcionesModal({ open: false, product: null })}
          onConfirm={(opcionesSeleccionadas) => {
            const p = posOpcionesModal.product;
            setPosOpcionesModal({ open: false, product: null });
            if (!p) return;
            confirmAddProductWithOpciones(p, opcionesSeleccionadas);
          }}
        />

        <PosProcesarVentaModal
          open={saleModalOpen}
          onClose={() => !saleProcessing && setSaleModalOpen(false)}
          mesaLabel={`${String(posTable?.zone || "").toUpperCase()} | ${posTable?.displayId || ""}`}
          currencySymbol={currencySymbol}
          exchangeRate={tipoCambio ?? DEFAULT_TIPO_CAMBIO_USD}
          lines={saleModalLines}
          totalOrdenBackend={saleBackendTotal}
          busy={saleProcessing}
          onGuardar={handleGuardarVenta}
        />

        {posCancelPinOpen && (
          <CancelPedidoPinModal
            open
            onClose={() => !posActionBusy && setPosCancelPinOpen(false)}
            loading={posActionBusy}
            title="Cancelar pedido en mesa"
            message="Ingresá el PIN de autorización para cancelar la orden y liberar la mesa."
            onConfirm={executePosCancelarConPin}
          />
        )}

        {moveOrderOpen && posTable && (
          <BackofficeDialog
            maxWidthClass="max-w-md"
            onBackdropClick={posActionBusy ? undefined : () => setMoveOrderOpen(false)}
          >
            <form onSubmit={handleConfirmTrasladarPedido} className="w-full min-w-0">
              <h3 className="text-lg font-semibold text-slate-800">Trasladar pedido a otra mesa</h3>
              <label className="mt-4 block text-xs font-semibold text-slate-600">
                Mesa destino (solo libres)
                <select
                  value={moveOrderTargetId}
                  onChange={(e) => setMoveOrderTargetId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {moveOrderCandidates.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.zone} · {t.displayId} (cap. {t.capacity})
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMoveOrderOpen(false);
                    setMoveOrderCandidates([]);
                  }}
                  disabled={posActionBusy}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={posActionBusy || moveOrderCandidates.length === 0}
                  className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 sm:w-auto"
                >
                  {posActionBusy ? "Trasladando pedido…" : "Confirmar traslado del pedido"}
                </button>
              </div>
            </form>
          </BackofficeDialog>
        )}
      </>
    );
  }

  return (
    <div
      className={
        mesasVistaExpandida
          ? "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4"
          : "min-w-0 space-y-4"
      }
    >
      <section
        className={
          mesasVistaExpandida
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            : "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        }
      >
        <div className={mesasVistaExpandida ? "shrink-0" : ""}>
          <TablesMesasStatsBar
            total={tables.length}
            libres={mesaStats.libres}
            ocupadas={mesaStats.ocupadas}
            reservadas={mesaStats.reservadas}
            cajaAbierta={cajaAbierta}
            onUbicaciones={openLocationsManager}
            onNuevaMesa={openCreate}
            layoutMode={mesasLayoutMode}
            onLayoutModeChange={setMesasLayoutMode}
          />
        </div>

        {mesasLayoutMode === "plano" ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TablesMesasFloorPlan
              tables={mesasPlanoList}
              cajaAbierta={cajaAbierta}
              isAdmin={isAdmin}
              tableIllustration={tableIllustration}
              activeTableMenu={activeTableMenu}
              setActiveTableMenu={setActiveTableMenu}
              onOpenPos={openPosView}
              onOpenEdit={openEdit}
              onRequestDelete={(id) => setConfirmDeleteTable({ open: true, id })}
            />
          </div>
        ) : (
          <TablesMesasZonesGrid
            zones={zones}
            cajaAbierta={cajaAbierta}
            isAdmin={isAdmin}
            tableIllustration={tableIllustration}
            activeTableMenu={activeTableMenu}
            setActiveTableMenu={setActiveTableMenu}
            onOpenPos={openPosView}
            onOpenEdit={openEdit}
            onRequestDelete={(id) => setConfirmDeleteTable({ open: true, id })}
          />
        )}
      </section>

      {formOpen && (
        <BackofficeDialog maxWidthClass="max-w-md" onBackdropClick={saving ? undefined : () => setFormOpen(false)}>
          <form onSubmit={saveTable} className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">{form.id ? "Editar mesa" : "Nueva mesa"}</h3>
            <div className="mt-4 space-y-3">
              <input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="Numero" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input type="number" min="1" value={form.capacidad} onChange={(e) => setForm((f) => ({ ...f, capacidad: e.target.value }))} placeholder="Capacidad" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <select value={form.ubicacionId} onChange={(e) => setForm((f) => ({ ...f, ubicacionId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                <option value="">Ubicacion</option>
                {locations.filter((l) => l.activo !== false).map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre || l.descripcion || `Ubicacion ${l.id}`}</option>
                ))}
              </select>
              <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Libre</option><option>Ocupada</option><option>Reservada</option>
              </select>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cancelar</button>
              <button disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </BackofficeDialog>
      )}

      {locationsModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-3xl" onBackdropClick={saving ? undefined : () => setLocationsModalOpen(false)}>
          <div className="w-full min-w-0">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Ubicaciones de mesas</h3>
                <p className="text-xs text-slate-500">Listado actual de ubicaciones registradas.</p>
              </div>
              <button
                type="button"
                onClick={() => setLocationsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
              <form onSubmit={saveLocation} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-800">{locationForm.id ? "Editar ubicación" : "Nueva ubicación"}</h4>
                <input
                  value={locationForm.nombre}
                  onChange={(e) => setLocationForm((s) => ({ ...s, nombre: e.target.value }))}
                  placeholder="Nombre (ej: Terraza)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <textarea
                  value={locationForm.descripcion}
                  onChange={(e) => setLocationForm((s) => ({ ...s, descripcion: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={locationForm.activo}
                    onChange={(e) => setLocationForm((s) => ({ ...s, activo: e.target.checked }))}
                  />
                  Activa
                </label>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setLocationForm({ id: null, nombre: "", descripcion: "", activo: true })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto"
                  >
                    Limpiar
                  </button>
                  <button disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:w-auto">
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">
                    {showInactiveLocations ? "Mostrando activas e inactivas" : "Mostrando solo activas"}
                  </p>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={showInactiveLocations}
                      onChange={(e) => setShowInactiveLocations(e.target.checked)}
                    />
                    Ver inactivas
                  </label>
                </div>
                {locations.length === 0 && <p className="text-sm text-slate-500">No hay ubicaciones.</p>}
                {locations
                  .filter((l) => showInactiveLocations || l.activo !== false)
                  .map((l) => (
                  <article
                    key={l.id}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                      l.activo === false ? "border-slate-200 bg-slate-50 opacity-80" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{l.nombre || l.descripcion || `Ubicación ${l.id}`}</p>
                      <p className="truncate text-xs text-slate-500">{l.descripcion || "-"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {l.activo === false ? (
                        <button
                          type="button"
                          onClick={() => toggleLocationActive(l, true)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Reactivar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => editLocation(l.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLocation({ open: true, id: l.id, name: l.nombre || `Ubicación ${l.id}` })}
                        className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </BackofficeDialog>
      )}

      {detailOpen && selectedTable && (
        <BackofficeDialog maxWidthClass="max-w-lg" onBackdropClick={() => setDetailOpen(false)}>
          <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">Mesa {selectedTable.displayId}</h3>
            <p className="mt-1 text-sm text-slate-600">Estado: {selectedTable.status} | Capacidad: {selectedTable.capacity}</p>
            <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm">
              {activeOrder ? (
                <>
                  <p className="font-semibold text-slate-800">Orden activa: {activeOrder.numero || activeOrder.id}</p>
                  <p className="text-slate-600">Estado: {activeOrder.estado || "Pendiente"}</p>
                </>
              ) : (
                <p className="text-slate-500">Sin orden activa.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setDetailOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cerrar</button>
            </div>
          </div>
        </BackofficeDialog>
      )}
      <ConfirmModal
        open={confirmDeleteTable.open}
        onClose={() => setConfirmDeleteTable({ open: false, id: null })}
        onConfirm={async () => {
          if (confirmDeleteTable.id) await removeTable(confirmDeleteTable.id);
        }}
        title="Eliminar mesa"
        message="¿Deseas desactivar esta mesa?"
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
      <ConfirmModal
        open={confirmDeleteLocation.open}
        onClose={() => setConfirmDeleteLocation({ open: false, id: null, name: "" })}
        onConfirm={async () => {
          if (confirmDeleteLocation.id) await removeLocation(confirmDeleteLocation.id);
        }}
        title="Eliminar ubicación"
        message={confirmDeleteLocation.name ? `¿Eliminar ubicación "${confirmDeleteLocation.name}"?` : "¿Eliminar ubicación?"}
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}

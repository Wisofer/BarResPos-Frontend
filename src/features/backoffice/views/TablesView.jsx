import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChefHat, Lock, Minus, MoreVertical, Pencil, Plus, Printer, Save, Trash2, XCircle } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton, PosProcesarVentaModal, StatCardsSkeleton } from "../components/index.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { formatCurrency } from "../utils/currency.js";
import { isAdminUser } from "../utils/auth.js";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { getToken } from "../../../api/token.js";
import { getApiUrl } from "../../../api/config.js";

function tableStatusClass(status) {
  if (status === "Libre") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "Reservada") return "bg-violet-50 text-violet-700 border-violet-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

export function TablesView({ onPosOpenChange }) {
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
  const posDeltaSyncBusyRef = useRef(false);
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
  const [tipoCambio, setTipoCambio] = useState(36.8);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ id: null, nombre: "", descripcion: "", activo: true });
  const [confirmDeleteLocation, setConfirmDeleteLocation] = useState({ open: false, id: null, name: "" });
  const [showInactiveLocations, setShowInactiveLocations] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(true);
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
    id: m.id,
    displayId: m.numero || m.codigo || `M-${String(i + 1).padStart(2, "0")}`,
    capacity: m.capacidad || 4,
    zone: m.ubicacion?.nombre || m.ubicacion || "Salon",
    status: m.estado || "Libre",
    activeOrdersCount: Number(m.ordenesActivas || 0),
    hasActiveOrder: Number(m.ordenesActivas || 0) > 0 || String(m.estado || "").toLowerCase() === "ocupada",
    detail: m.ordenesActivas > 0 ? `${m.ordenesActivas} orden(es) activa(s)` : "Lista para atender",
  });

  const loadTables = async () => {
    const data = await backofficeApi.listMesas({ page: 1, pageSize: 100 });
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
        const tcValue = Number(tc?.tipoCambioDolar ?? tc?.TipoCambioDolar ?? tc?.valor ?? 36.8);
        if (Number.isFinite(tcValue) && tcValue > 0) setTipoCambio(tcValue);
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
      setError(msg);
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
      setError(msg);
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
      setError(msg);
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
      setError(msg);
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
      setError(msg);
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
      setError(e2.message || "No se pudo guardar la mesa.");
      snackbar.error(e2.message || "No se pudo guardar la mesa.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id, estado) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.patchMesaEstado(id, estado);
      await loadTables();
      snackbar.success("Estado de mesa actualizado.");
    } catch (e) {
      setError(e.message || "No se pudo cambiar el estado.");
      snackbar.error(e.message || "No se pudo cambiar el estado.");
    } finally {
      setSaving(false);
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
      setError(e.message || "No se pudo eliminar la mesa.");
      snackbar.error(e.message || "No se pudo eliminar la mesa.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (table) => {
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
    try {
      const [orderActiva, productsData, categoriesData] = await Promise.all([
        backofficeApi.getMesaOrdenActiva(table.id).catch(() => null),
        backofficeApi.listProductos({ page: 1, pageSize: 200, activos: true }),
        backofficeApi.catalogoCategoriasProducto(),
      ]);
      const orderActive = orderActiva?.data ?? orderActiva?.Data ?? orderActiva;
      setPosOrderId(
        orderActive?.id ??
          orderActive?.Id ??
          orderActive?.ordenId ??
          orderActive?.pedidoId ??
          null
      );

      // Si ya hay productos agregados en backend para esta mesa,
      // sincronizamos la UI para que no se "pierdan" al volver a entrar al POS.
      const backendItems = orderActive?.items ?? orderActive?.Items;
      if (backendItems) {
        setPosCart(mapBackendItemsToCart(backendItems));
        setPosCommitted(true);
      } else {
        setPosCart([]);
        setPosCommitted(false);
      }

      const products = Array.isArray(productsData?.items) ? productsData.items : [];
      const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.items || [];
      setPosProducts(products);
      setPosCategories(categories);
    } catch (e) {
      setError(e.message || "No se pudo cargar productos para la mesa.");
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

  const filteredPosProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return posProducts.filter((p) => {
      const categoryMatch = !posCategory || String(p.categoriaProductoId || "") === String(posCategory);
      if (!categoryMatch) return false;
      if (!q) return true;
      return `${p.nombre || ""} ${p.codigo || ""}`.toLowerCase().includes(q);
    });
  }, [posProducts, posCategory, posSearch]);

  const syncPosDeltaAdd = async (product, cantidad = 1) => {
    if (!posTable) return;
    if (!cajaAbierta) return;
    if (posActionBusy) return;
    if (posDeltaSyncBusyRef.current) return;
    posDeltaSyncBusyRef.current = true;
    try {
      const currentId = posOrderIdRef.current;
      const body = {
        mesaId: Number(posTable.id),
        ordenId: currentId ?? undefined,
        observaciones: "",
        productos: [{ productoId: Number(product.id), cantidad, notas: "" }],
      };
      const data = await backofficeApi.posOrdenes(body);
      const newOrderId =
        data?.id ??
        data?.Id ??
        data?.ordenId ??
        data?.OrdenId ??
        data?.pedidoId ??
        data?.PedidoId ??
        data?.facturaId ??
        data?.FacturaId ??
        currentId ??
        null;

      if (newOrderId && newOrderId !== posOrderIdRef.current) {
        setPosOrderId(newOrderId);
      }

      // Ya existe en backend el delta del carrito.
      setPosCommitted(true);
      await loadTables(); // refresca la ocupación real de la mesa
    } catch (e) {
      const msg = e?.message || "No se pudo agregar el producto en backend.";
      if (String(msg).includes("409") || msg.toLowerCase().includes("caja")) {
        setCajaAbierta(false);
      }
      const normalized = String(msg)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      if (normalized.includes("caja") && normalized.includes("cerrada")) {
        await syncCajaEstado();
        // Revierte el alta optimista si backend no permitió agregar por caja cerrada.
        setPosCart((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.id === product.id);
          if (idx < 0) return prev;
          const currentQty = Number(next[idx].qty || 0);
          const newQty = Math.max(0, currentQty - Number(cantidad || 1));
          if (newQty <= 0) next.splice(idx, 1);
          else next[idx] = { ...next[idx], qty: newQty };
          return next;
        });
      }
      setError(msg);
      snackbar.error(msg);
    } finally {
      posDeltaSyncBusyRef.current = false;
    }
  };

  const addProductToCart = async (product) => {
    if (!cajaAbierta) {
      const abiertaAhora = await syncCajaEstado();
      if (!abiertaAhora) {
        snackbar.info("Caja cerrada: no se puede agregar productos.");
        return;
      }
    }
    setPosCart((prev) => {
      const idx = prev.findIndex((x) => x.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { id: product.id, name: product.nombre || "Producto", price: Number(product.precio || 0), qty: 1 }];
    });

    // Actualiza la orden activa en backend para reflejar ocupación en tiempo real.
    void syncPosDeltaAdd(product, 1);
  };

  const updateCartQty = (productId, delta) => {
    setPosCart((prev) => {
      const next = prev
        .map((item) => (item.id === productId ? { ...item, qty: Math.max(0, Number(item.qty || 0) + delta) } : item))
        .filter((item) => item.qty > 0);
      return next;
    });
    setPosCommitted(false);
  };

  const removeFromCart = (productId) => {
    setPosCart((prev) => prev.filter((item) => item.id !== productId));
    setPosCommitted(false);
  };

  const posSubtotal = useMemo(() => posCart.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.qty || 0), 0), [posCart]);

  useEffect(() => {
    posOrderIdRef.current = posOrderId;
  }, [posOrderId]);

  useEffect(() => {
    // Si el usuario deja el carrito vacío, liberamos la mesa cancelando la orden activa en backend.
    if (!posOpen || !posTable) return;
    if (!posOrderId) return;
    if (posCart.length !== 0) return;
    if (posActionBusy) return;
    if (posDeltaSyncBusyRef.current) return;

    const cancelWhenEmpty = async () => {
      try {
        setPosActionBusy(true);
        await backofficeApi.posCancelarOrden(posOrderId);
        setPosOrderId(null);
        setPosCommitted(false);
        await loadTables();
      } catch (e) {
        // Silencioso: el carrito ya está vacío en UI, pero si backend no cancela mostramos un error.
        const msg = e?.message || "No se pudo liberar la mesa al limpiar el carrito.";
        setError(msg);
        snackbar.error(msg);
      } finally {
        setPosActionBusy(false);
      }
    };

    cancelWhenEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posCart.length, posOrderId, posOpen, posTable]);

  const closePosView = () => {
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
    // Refresca el listado de mesas para que se vea el cambio de estado (rojo/ocupada).
    loadTables();
  };

  const mapBackendItemsToCart = (items) => {
    const list = Array.isArray(items) ? items : [];
    return list
      .map((it, idx) => {
        const productoId =
          it?.productoId ??
          it?.ProductoId ??
          it?.servicioId ??
          it?.ServicioId ??
          it?.producto?.id ??
          it?.Producto?.Id ??
          it?.servicio?.id ??
          it?.Servicio?.Id ??
          it?.id ??
          idx;

        const qty = Number(it?.cantidad ?? it?.Cantidad ?? it?.qty ?? 0);
        const montoLinea = Number(it?.monto ?? it?.Monto ?? it?.total ?? it?.Total ?? it?.importe ?? it?.Importe ?? 0);
        const priceUnit = Number(
          it?.precioUnitario ?? it?.PrecioUnitario ?? it?.precio ?? it?.Precio ?? it?.precioUnitarioServicio ?? 0
        );
        const computedPrice = priceUnit > 0 ? priceUnit : qty > 0 ? montoLinea / qty : 0;
        const name =
          it?.producto?.nombre ??
          it?.Producto?.Nombre ??
          it?.servicio?.nombre ??
          it?.Servicio?.Nombre ??
          it?.nombre ??
          it?.Nombre ??
          it?.productoNombre ??
          it?.ProductoNombre ??
          it?.servicioNombre ??
          it?.ServicioNombre ??
          it?.servicio ??
          it?.Servicio ??
          it?.producto ??
          it?.Producto ??
          "Producto";

        return {
          id: Number.isNaN(Number(productoId)) ? idx : Number(productoId),
          name: String(name),
          price: Number.isFinite(computedPrice) ? computedPrice : 0,
          qty: qty > 0 ? qty : 0,
        };
      })
      .filter((x) => x.qty > 0);
  };

  const openPreCuentaPrint = ({ mesaLabel, zoneLabel, lines, total, currency }) => {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      snackbar.error("Permita ventanas emergentes para imprimir la cuenta.");
      return;
    }
    const sym = currency || "C$";
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
            }, 150);
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

  const openBackendPrintHtml = (html) => {
    if (!html || typeof html !== "string") return false;
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      printBlobInHiddenFrame(blob);
      return true;
    } catch {
      return false;
    }
  };

  const ensurePosOrderSynced = async () => {
    if (!posTable) return posOrderId;
    if (posCart.length === 0) return posOrderId;
    if (posActionBusy) return posOrderId;

    setPosActionBusy(true);
    setError("");
    try {
      // Aseguramos que exista la orden activa (si por algún motivo no existe aún).
      if (!posOrderId) {
        const productos = posCart.map((x) => ({
          productoId: Number(x.id),
          cantidad: Number(x.qty),
          notas: "",
        }));
        const data = await backofficeApi.posOrdenes({
          mesaId: Number(posTable.id),
          ordenId: undefined,
          observaciones: "",
          productos,
        });
        const newOrderId =
          data?.id ??
          data?.Id ??
          data?.ordenId ??
          data?.OrdenId ??
          data?.pedidoId ??
          data?.PedidoId ??
          data?.facturaId ??
          data?.FacturaId ??
          data?.orden?.id ??
          data?.orden?.Id ??
          null;
        if (!newOrderId) throw new Error("No se pudo crear la orden activa en backend.");
        setPosOrderId(newOrderId);
      }

      const currentId = posOrderId ?? posOrderIdRef.current;
      if (!currentId) throw new Error("OrdenId inválido para sincronizar.");

      // PUT reemplaza items: así queda 1:1 con el carrito (incluye +/-).
      const pedido = await backofficeApi.getPedido(currentId);
      const items = posCart.map((x) => ({
        servicioId: Number(x.id),
        cantidad: Number(x.qty),
        precioUnitario: Number(x.price || 0),
        estado: "Listo",
        notas: "",
      }));

      await backofficeApi.updatePedido(currentId, {
        mesaId: pedido?.mesaId ?? pedido?.MesaId ?? Number(posTable.id),
        clienteId: pedido?.clienteId ?? pedido?.ClienteId ?? null,
        meseroId: pedido?.meseroId ?? pedido?.MeseroId ?? null,
        estado: pedido?.estado ?? pedido?.Estado ?? "Listo",
        estadoCocina: pedido?.estadoCocina ?? pedido?.EstadoCocina ?? "Listo",
        observaciones: pedido?.observaciones ?? pedido?.Observaciones ?? null,
        items,
      });

      const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
      const fresh = freshRaw?.data ?? freshRaw?.Data ?? freshRaw;
      const backendItems = fresh?.items ?? fresh?.Items;
      if (backendItems) setPosCart(mapBackendItemsToCart(backendItems));

      setPosCommitted(true);
      return currentId;
    } catch (e) {
      const msg = e?.message || "No se pudo enviar la orden.";
      setError(msg);
      snackbar.error(msg);
      throw e;
    } finally {
      setPosActionBusy(false);
    }
  };

  const handleCancelarPos = async () => {
    if (!posTable) return;
    if (posActionBusy) return;
    setPosActionBusy(true);
    setError("");
    try {
      if (posOrderId) {
        await backofficeApi.posCancelarOrden(posOrderId);
        snackbar.success("Pedido cancelado y mesa liberada.");
      } else {
        snackbar.info("No había una orden activa para cancelar.");
      }
      closePosView();
      await loadTables();
    } catch (e) {
      const msg = e?.message || "No se pudo cancelar el pedido.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setPosActionBusy(false);
    }
  };

  const handleEnviarCocina = async () => {
    if (!posTable) return;
    if (posActionBusy) return;
    try {
      if (!posCommitted && posCart.length > 0) await ensurePosOrderSynced();
      if (!posOrderId) throw new Error("No hay orden activa para enviar a cocina.");

      // Si la orden ya existía (posCart vacío), cargamos items para mantener UI sincronizada.
      if (!posCommitted && posCart.length === 0) {
        const freshRaw = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
        const fresh = freshRaw?.data ?? freshRaw?.Data ?? freshRaw;
        const items = fresh?.items ?? fresh?.Items;
        if (items) setPosCart(mapBackendItemsToCart(items));
        setPosCommitted(true);
      }

      // Para que "Enviar cocina" haga algo real, sincronizamos el EstadoCocina.
      const freshRaw2 = await backofficeApi.getMesaOrdenActiva(posTable.id).catch(() => null);
      const fresh2 = freshRaw2?.data ?? freshRaw2?.Data ?? freshRaw2;
      const estadoCocinaActual =
        fresh2?.estadoCocina ??
        fresh2?.EstadoCocina ??
        fresh2?.estado_cocina ??
        fresh2?.Estado_cocina ??
        null;

      // Si ya está "Listo", mantenemos. Si está "Pendiente", lo movemos a "En Preparación".
      const nextEstadoCocina = estadoCocinaActual === "Pendiente" ? "En Preparación" : "Listo";
      await backofficeApi.cocinaOrdenEstado(posOrderId, nextEstadoCocina);

      snackbar.success("Orden enviada a cocina.");
      setPosMobileTab("order");
    } catch (e) {
      const msg = e?.message || "No se pudo enviar a cocina.";
      setError(msg);
      snackbar.error(msg);
    }
  };

  const openProcesarVentaModal = async () => {
    if (!posTable) return;
    if (posActionBusy || saleProcessing) return;
    setError("");
    try {
      if (!posCommitted && posCart.length > 0) await ensurePosOrderSynced();

      let ordenId = posOrderId ?? posOrderIdRef.current;
      let lines = posCart.map((x) => ({
        id: x.id,
        name: x.name,
        qty: x.qty,
        price: x.price,
        lineTotal: Number(x.price || 0) * Number(x.qty || 0),
      }));

      if (lines.length === 0) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = raw?.data ?? raw?.Data ?? raw;
        if (!order) throw new Error("No hay orden activa para cobrar.");
        ordenId = order.id ?? order.Id ?? order.ordenId ?? order.OrdenId ?? ordenId;
        const backendItems = order.items ?? order.Items;
        if (!backendItems?.length) throw new Error("La orden no tiene productos.");
        const mapped = mapBackendItemsToCart(backendItems);
        lines = mapped.map((x) => ({
          id: x.id,
          name: x.name,
          qty: x.qty,
          price: x.price,
          lineTotal: Number(x.price || 0) * Number(x.qty || 0),
        }));
      }

      if (!ordenId) throw new Error("No hay orden activa para cobrar.");

      let totalBackend = null;
      try {
        const pedido = await backofficeApi.getPedido(ordenId);
        const m = pedido?.monto ?? pedido?.Monto ?? pedido?.total ?? pedido?.Total;
        if (m != null && Number.isFinite(Number(m))) totalBackend = Number(m);
      } catch {
        /* ignore */
      }

      setSaleModalLines(lines);
      setSaleBackendTotal(totalBackend);
      setSaleOrdenId(ordenId);
      setSaleModalOpen(true);
    } catch (e) {
      const msg = e?.message || "No se pudo abrir cobro.";
      setError(msg);
      snackbar.error(msg);
    }
  };

  const handleGuardarVenta = async (form) => {
    if (!posTable || !saleOrdenId) return;
    setSaleProcessing(true);
    setError("");
    try {
      const obsParts = [
        form.comentario,
        form.descuento > 0 ? `Descuento: ${form.descuento}` : null,
        form.moneda === "USD" ? `TC: ${form.tipoCambioAplicado}` : null,
        form.tipoPago === "Efectivo"
          ? `Recibido: ${form.montoRecibido} ${form.moneda}, Vuelto: ${form.vueltoMoneda} ${form.moneda} (${form.vueltoCordobas} C$)`
          : null,
      ].filter(Boolean);

      // Backend actualizado: interpreta monto según Moneda.
      // Enviamos SIEMPRE base contable C$ para evitar ambigüedad.
      const montoPagado =
        form.tipoPago === "Efectivo" ? Number(form.montoRecibidoCordobas || 0) : Number(form.totalAPagarCordobas || 0);

      const payload = {
        ordenId: Number(saleOrdenId),
        tipoPago: form.tipoPago,
        montoPagado,
        moneda: "C",
        banco: null,
        tipoCuenta: null,
        observaciones: obsParts.join(" | ") || "Pago POS",
        montoCordobasFisico: null,
        montoDolaresFisico: null,
        montoCordobasElectronico: null,
        montoDolaresElectronico: null,
      };

      let resp;
      try {
        resp = await backofficeApi.ventasGestionarPago(payload);
      } catch {
        resp = await backofficeApi.ventasProcesarPago(payload);
      }

      const url = resp?.urlImpresionRecibo ?? resp?.UrlImpresionRecibo ?? resp?.url ?? resp?.Url;

      if (url) {
        const token = getToken();
        const resolved =
          url?.startsWith("http") ? url : url?.startsWith("/") ? `${getApiUrl()}${url}` : `${getApiUrl()}/${url}`;

        try {
          const res = await fetch(resolved, {
            method: "GET",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
          } else {
            window.open(resolved, "_blank", "noopener,noreferrer");
          }
        } catch {
          window.open(resolved, "_blank", "noopener,noreferrer");
        }
      }

      snackbar.success("Venta procesada.");
      setSaleModalOpen(false);
      setSaleOrdenId(null);
      setSaleModalLines([]);
      setSaleBackendTotal(null);
      closePosView();
      await loadTables();
    } catch (e) {
      const msg = e?.message || "No se pudo registrar el pago.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setSaleProcessing(false);
    }
  };

  const handleImprimirCuenta = async () => {
    if (!posTable) return;
    if (posActionBusy || saleProcessing) return;
    setError("");
    try {
      if (!posCommitted && posCart.length > 0) await ensurePosOrderSynced();
      let ordenId = posOrderId ?? posOrderIdRef.current;

      if (!ordenId) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = raw?.data ?? raw?.Data ?? raw;
        if (!order) throw new Error("No hay orden para imprimir.");
        ordenId = order.id ?? order.Id ?? order.ordenId ?? order.OrdenId ?? null;
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

      if (htmlPrecuenta && openBackendPrintHtml(htmlPrecuenta)) {
        snackbar.info("Pre-cuenta lista para imprimir.");
        return;
      }

      // Fallback oficial: endpoint HTML directo.
      try {
        const rawHtml = await backofficeApi.pedidoPrecuentaHtml(ordenId);
        const htmlDirect = typeof rawHtml === "string" ? rawHtml : rawHtml?.html ?? rawHtml?.Html ?? null;
        if (htmlDirect && openBackendPrintHtml(htmlDirect)) {
          snackbar.info("Pre-cuenta lista para imprimir.");
          return;
        }
      } catch {
        /* continue to local fallback */
      }

      let lines = posCart.map((x) => ({
        id: x.id,
        name: x.name,
        qty: x.qty,
        price: x.price,
        lineTotal: Number(x.price || 0) * Number(x.qty || 0),
      }));

      if (lines.length === 0) {
        const raw = await backofficeApi.getMesaOrdenActiva(posTable.id);
        const order = raw?.data ?? raw?.Data ?? raw;
        if (!order) throw new Error("No hay orden para imprimir.");
        const backendItems = order.items ?? order.Items;
        if (!backendItems?.length) throw new Error("No hay productos en la orden.");
        const mapped = mapBackendItemsToCart(backendItems);
        lines = mapped.map((x) => ({
          id: x.id,
          name: x.name,
          qty: x.qty,
          price: x.price,
          lineTotal: Number(x.price || 0) * Number(x.qty || 0),
        }));
      }

      let total = lines.reduce((s, x) => s + x.lineTotal, 0);
      const oid = posOrderId ?? posOrderIdRef.current;
      if (oid) {
        try {
          const pedido = await backofficeApi.getPedido(oid);
          const m = pedido?.monto ?? pedido?.Monto ?? pedido?.total ?? pedido?.Total;
          if (m != null && Number.isFinite(Number(m))) total = Number(m);
        } catch {
          /* ignore */
        }
      }

      openPreCuentaPrint({
        mesaLabel: posTable.displayId,
        zoneLabel: posTable.zone,
        lines,
        total,
        currency: "C$",
      });
      snackbar.info("Pre-cuenta lista para imprimir (modo local).");
    } catch (e) {
      const msg = e?.message || "No se pudo imprimir la cuenta.";
      setError(msg);
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
    return (
      <>
        <StatCardsSkeleton />
        <ListSkeleton rows={5} />
      </>
    );
  }

  if (posOpen && posTable) {
    return (
      <>
        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-sm lg:h-[calc(100vh-10.5rem)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {String(posTable.zone || "").toUpperCase()} | {posTable.displayId}
              </h2>
              <p className="text-xs text-slate-500">Selecciona productos para esta mesa.</p>
            </div>
            <button
              type="button"
              onClick={closePosView}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a mesas
            </button>
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
                <input
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Búsqueda de productos"
                  className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                {posLoading ? (
                  <ListSkeleton rows={4} />
                ) : (
                  <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-auto">
                    {filteredPosProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToCart(p)}
                        disabled={posActionBusy || !cajaAbierta}
                        className="flex min-h-[92px] items-end rounded-md border border-slate-200 bg-gradient-to-b from-slate-200 to-slate-500 px-2 py-2 text-left text-[10px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {String(p.nombre || "Producto").toUpperCase()}
                      </button>
                    ))}
                    {filteredPosProducts.length === 0 && <p className="col-span-2 py-8 text-center text-xs text-slate-500">Sin productos para mostrar.</p>}
                  </div>
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
                        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              disabled={posActionBusy}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-200 text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                            <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, -1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-5 text-center font-semibold text-slate-800">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, 1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span>P/U: {formatCurrency(item.price, "C$")}</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(item.price * item.qty, "C$")}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {posCart.length > 0 && (
                  <>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(posSubtotal, "C$")}</span></div>
                      <div className="flex justify-between"><span>Total</span><span className="font-bold">{formatCurrency(posSubtotal, "C$")}</span></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
                      <button type="button" onClick={handleCancelarPos} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-red-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
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
                    <button type="button" onClick={handleCancelarPos} disabled={posActionBusy} className="inline-flex items-center justify-center gap-1 rounded-sm bg-red-500 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
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
                <p className="text-sm font-bold text-slate-800">{formatCurrency(posSubtotal, "C$")}</p>
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
                        <th className="px-2 py-2">CNT</th>
                        <th className="px-2 py-2">P/U</th>
                        <th className="px-2 py-2">PT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posCart.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                            Sin productos en la orden.
                          </td>
                        </tr>
                      )}
                      {posCart.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-2 py-2">{item.name}</td>
                          <td className="px-2 py-2">
                            <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, -1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-5 text-center font-semibold text-slate-800">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, 1)}
                                disabled={posActionBusy}
                                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2">{formatCurrency(item.price, "C$")}</td>
                          <td className="px-2 py-2 font-semibold">
                            <div className="flex items-center justify-between gap-2">
                              <span>{formatCurrency(item.price * item.qty, "C$")}</span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
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
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(posSubtotal, "C$")}</span></div>
                  <div className="flex justify-between"><span>Total</span><span className="font-bold">{formatCurrency(posSubtotal, "C$")}</span></div>
                </div>
              )}

              {(posCart.length > 0 || posOrderId) && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-200 pt-2">
                  <button type="button" onClick={handleCancelarPos} disabled={posActionBusy} className="inline-flex items-center gap-1 rounded-sm bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
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
              <input
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Búsqueda de productos"
                className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {posLoading ? (
                <ListSkeleton rows={4} />
              ) : (
                <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-auto lg:h-[calc(100%-2.5rem)] lg:max-h-full xl:grid-cols-3">
                  {filteredPosProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToCart(p)}
                      disabled={posActionBusy || !cajaAbierta}
                      className="flex min-h-[86px] items-end rounded-md border border-slate-200 bg-gradient-to-b from-slate-200 to-slate-500 px-2 py-2 text-left text-[10px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {String(p.nombre || "Producto").toUpperCase()}
                    </button>
                  ))}
                  {filteredPosProducts.length === 0 && <p className="col-span-2 py-8 text-center text-xs text-slate-500">Sin productos para mostrar.</p>}
                </div>
              )}
            </article>
          </div>
        </section>

        <PosProcesarVentaModal
          open={saleModalOpen}
          onClose={() => !saleProcessing && setSaleModalOpen(false)}
          mesaLabel={`${String(posTable?.zone || "").toUpperCase()} | ${posTable?.displayId || ""}`}
          currencySymbol="C$"
          lines={saleModalLines}
          totalOrdenBackend={saleBackendTotal}
          exchangeRate={tipoCambio}
          busy={saleProcessing}
          onGuardar={handleGuardarVenta}
        />
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Total: {tables.length}</span>
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Libres: {tables.filter((t) => t.status === "Libre").length}</span>
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Ocupadas: {tables.filter((t) => t.status === "Ocupada").length}</span>
            <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">Reservadas: {tables.filter((t) => t.status === "Reservada").length}</span>
            <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cajaAbierta ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openLocationsManager} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              Ubicaciones
            </button>
            <button onClick={openCreate} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Nueva mesa
            </button>
          </div>
        </div>

        {zones.length === 0 && <p className="text-sm text-slate-500">No hay mesas registradas.</p>}
        <div className="space-y-4">
          {zones.map((zone) => (
            <div key={zone.name}>
              <div className="mb-2 rounded-md bg-amber-200/70 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-amber-900">
                {zone.name}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {zone.items.map((table) => (
                  <article
                    key={table.id}
                    className={`relative group rounded-xl border p-3 shadow-sm transition ${
                      cajaAbierta ? "hover:-translate-y-0.5 hover:shadow" : "opacity-95"
                    } ${
                      table.hasActiveOrder ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    {!cajaAbierta && (
                      <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/20" />
                    )}
                    {isAdmin && (
                      <>
                        {/* Desktop: botones al hacer hover */}
                        <div className="absolute right-2 top-2 z-20 hidden gap-1 lg:flex opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              openEdit(table.id);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 hover:bg-white"
                            title="Editar mesa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setConfirmDeleteTable({ open: true, id: table.id });
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white/90 text-red-600 hover:bg-white"
                            title="Borrar mesa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mobile/Tablet: menú ... */}
                        <div className="absolute right-2 top-2 z-50 lg:hidden">
                          <button
                            type="button"
                            data-table-menu-trigger
                            aria-label="Acciones de mesa"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveTableMenu((curr) => (curr === table.id ? null : table.id));
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 hover:bg-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {activeTableMenu === table.id && (
                            <div
                              data-table-menu
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 z-[60] w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg pointer-events-auto"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTableMenu(null);
                                  openEdit(table.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-600" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTableMenu(null);
                                  setConfirmDeleteTable({ open: true, id: table.id });
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Borrar
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className={`text-xs font-bold uppercase ${table.hasActiveOrder ? "text-white" : "text-slate-800"}`}>{table.displayId}</p>
                      {table.hasActiveOrder && table.activeOrdersCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1.5 text-[10px] font-bold text-white">
                          {table.activeOrdersCount}
                        </span>
                      )}
                    </div>

                    <button type="button" onClick={() => openPosView(table)} className="w-full" disabled={!cajaAbierta}>
                      <img src={tableIllustration} alt={`Mesa ${table.displayId}`} className="mx-auto h-28 w-full object-contain" />
                    </button>
                    {!cajaAbierta && (
                      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 inline-flex items-center justify-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        <Lock className="h-3.5 w-3.5" />
                        Bloqueada por caja cerrada
                      </div>
                    )}

                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <form onSubmit={saveTable} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
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
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
              <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}

      {locationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
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
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationForm({ id: null, nombre: "", descripcion: "", activo: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Limpiar
                  </button>
                  <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
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
                    <div className="flex gap-2">
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
        </div>
      )}

      {detailOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
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
              <button onClick={() => setDetailOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cerrar</button>
            </div>
          </div>
        </div>
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
    </>
  );
}

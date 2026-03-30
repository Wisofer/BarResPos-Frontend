import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  History,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { PAGINATION } from "../constants/pagination.js";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficeDialog, ListSkeleton, StatCardsSkeleton } from "../components/index.js";
import { formatCurrency } from "../utils/currency.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";
import { ProductCategoriesView } from "./ProductCategoriesView.jsx";
import { PROVIDERS_UPDATED_EVENT } from "../providers/constants.js";
import { resolveProductCodigoForSave } from "../utils/productCodigo.js";
import {
  parseOpcionesEspecialesFromGruposApi,
  syncOpcionesEspecialesBackend,
} from "../utils/productoOpcionesEspecialesSync.js";

/** Solo estos productos tienen movimientos de inventario en POS/backend. */
function tieneControlStock(p) {
  return Boolean(p?.controlarStock ?? p?.ControlarStock);
}

function movementProductId(m) {
  return m?.productoId ?? m?.ProductoId ?? m?.producto?.id ?? m?.Producto?.Id ?? null;
}

function movementProductLabel(m, productList) {
  const fromApi =
    m?.productoNombre ??
    m?.ProductoNombre ??
    m?.nombreProducto ??
    m?.NombreProducto ??
    m?.producto?.nombre ??
    m?.Producto?.Nombre;
  if (fromApi) return String(fromApi);
  const id = movementProductId(m);
  const p = productList.find((x) => String(x.id) === String(id));
  if (p?.nombre) return p.nombre;
  return id != null ? `Producto #${id}` : "—";
}

function formatMovementDate(m) {
  const raw = m?.fecha ?? m?.Fecha ?? m?.fechaCreacion ?? m?.FechaCreacion ?? m?.createdAt ?? m?.CreatedAt;
  if (raw == null || raw === "") return null;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(raw);
  }
}

/** Campos táctiles en móvil (min 44px) y text-base para evitar zoom en iOS al enfocar. */
const productModalFieldClass =
  "mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:min-h-0 sm:py-2 sm:text-sm";
const productModalCodigoFieldClass = `${productModalFieldClass} placeholder:text-[10px] placeholder:leading-snug placeholder:text-slate-400 sm:placeholder:text-xs`;
const productModalTextareaClass =
  "mt-1 w-full min-h-[5.5rem] rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:min-h-0 sm:py-2 sm:text-sm";

export function ProductsView({ currencySymbol = "C$" }) {
  const snackbar = useSnackbar();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockMode, setStockMode] = useState("entrada");
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [productHistoryModalOpen, setProductHistoryModalOpen] = useState(false);
  const [categoriesScreen, setCategoriesScreen] = useState(false);
  const [movementRows, setMovementRows] = useState([]);
  const [movementProductLookup, setMovementProductLookup] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [form, setForm] = useState({
    id: null,
    codigo: "",
    nombre: "",
    descripcion: "",
    precioVenta: "",
    precioCompra: "",
    categoriaProductoId: "",
    proveedorId: "",
    stock: "",
    stockMinimo: "",
    controlarStock: true,
    activo: true,
    opcionesEspecialesOn: false,
    opcionesEspecialesLines: [""],
    opcionesEspecialesGrupoId: null,
  });
  const [stockForm, setStockForm] = useState({
    productoId: "",
    cantidad: "",
    costoUnitario: "",
    proveedorId: "",
    numeroFactura: "",
    subtipo: "Daño",
    cantidadNueva: "",
    observaciones: "",
  });
  const [confirmAction, setConfirmAction] = useState({ open: false, type: "", id: null, name: "" });
  const [stockModalProducts, setStockModalProducts] = useState([]);
  const [stockProductQuery, setStockProductQuery] = useState("");
  const [stockModalLoading, setStockModalLoading] = useState(false);
  const [stockSuggestOpen, setStockSuggestOpen] = useState(false);
  const stockSuggestBlurTimerRef = useRef(null);

  const loadProducts = async (categoriaId = selectedCategory) => {
    const data = await backofficeApi.listProductos({
      page: 1,
      pageSize: PAGINATION.PRODUCTOS_ADMIN,
      search: search || undefined,
      categoriaId: categoriaId || undefined,
      activos: true,
    });
    setProducts(Array.isArray(data?.items) ? data.items : []);
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([loadProducts(""), backofficeApi.catalogoCategoriasProducto(), backofficeApi.catalogoProveedores()])
      .then(([, cat, prov]) => {
        if (!mounted) return;
        setCategories(Array.isArray(cat) ? cat : cat?.items || []);
        setProviders(Array.isArray(prov) ? prov : prov?.items || []);
      })
      .catch((e) => mounted && setError(e.message || "No se pudo cargar productos."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onProvidersUpdated = async () => {
      try {
        const prov = await backofficeApi.catalogoProveedores();
        setProviders(Array.isArray(prov) ? prov : prov?.items || []);
      } catch {
        /* silencioso: el usuario puede recargar la vista */
      }
    };
    window.addEventListener(PROVIDERS_UPDATED_EVENT, onProvidersUpdated);
    return () => window.removeEventListener(PROVIDERS_UPDATED_EVENT, onProvidersUpdated);
  }, []);

  const reloadCategoriesOnly = useCallback(async () => {
    try {
      const cat = await backofficeApi.catalogoCategoriasProducto();
      setCategories(Array.isArray(cat) ? cat : cat?.items || []);
    } catch (e) {
      snackbar.error(e.message || "No se pudo actualizar categorías.");
    }
  }, [snackbar]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => String(p.categoriaProductoId || "") === String(selectedCategory));
  }, [products, selectedCategory]);

  const stockAutocompleteList = useMemo(() => {
    const raw = stockModalProducts.length > 0 ? stockModalProducts : products;
    const list = raw.filter(tieneControlStock);
    const q = stockProductQuery.trim().toLowerCase();
    if (!q) return [];
    return list
      .filter((p) => {
        const hay = `${p.nombre || ""} ${p.codigo || ""} ${p.categoria || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 10);
  }, [stockModalProducts, products, stockProductQuery]);

  useEffect(() => {
    if (!stockModalOpen) {
      setStockSuggestOpen(false);
      if (stockSuggestBlurTimerRef.current) {
        window.clearTimeout(stockSuggestBlurTimerRef.current);
        stockSuggestBlurTimerRef.current = null;
      }
    }
  }, [stockModalOpen]);

  const selectedStockProduct = useMemo(() => {
    const raw = stockModalProducts.length > 0 ? stockModalProducts : products;
    const list = raw.filter(tieneControlStock);
    return list.find((p) => String(p.id) === String(stockForm.productoId));
  }, [stockModalProducts, products, stockForm.productoId]);

  const stockModalProductCount = useMemo(() => {
    const raw = stockModalProducts.length > 0 ? stockModalProducts : products;
    return raw.filter(tieneControlStock).length;
  }, [stockModalProducts, products]);

  const peerCodigos = useCallback(
    (excludeProductId) =>
      products
        .filter((p) => !excludeProductId || String(p.id) !== String(excludeProductId))
        .map((p) => p.codigo),
    [products]
  );

  const openCreate = () => {
    setForm({
      id: null,
      codigo: "",
      nombre: "",
      descripcion: "",
      precioVenta: "",
      precioCompra: "",
      categoriaProductoId: selectedCategory || categories[0]?.id || "",
      proveedorId: providers[0]?.id || "",
      stock: "",
      stockMinimo: "",
      controlarStock: true,
      activo: true,
      opcionesEspecialesOn: false,
      opcionesEspecialesLines: [""],
      opcionesEspecialesGrupoId: null,
    });
    setModalOpen(true);
  };

  const openStockModal = async (mode) => {
    setStockMode(mode);
    setStockProductQuery("");
    setStockSuggestOpen(false);
    setStockForm({
      productoId: "",
      cantidad: "",
      costoUnitario: "",
      proveedorId: providers[0]?.id != null ? String(providers[0].id) : "",
      numeroFactura: "",
      subtipo: "Daño",
      cantidadNueva: "",
      observaciones: "",
    });
    setStockModalOpen(true);
    setStockModalLoading(true);
    try {
      const data = await backofficeApi.listProductos({ page: 1, pageSize: PAGINATION.CATALOG_ALERTS, activos: true });
      const items = Array.isArray(data?.items) ? data.items : [];
      setStockModalProducts(items.filter(tieneControlStock));
    } catch {
      setStockModalProducts(products.filter(tieneControlStock));
    } finally {
      setStockModalLoading(false);
    }
  };

  const submitStockAction = async (e) => {
    e.preventDefault();
    if (!stockForm.productoId) {
      snackbar.error("Selecciona un producto.");
      return;
    }
    if (!selectedStockProduct) {
      snackbar.error("Ese producto no tiene control de stock activo o no está en el catálogo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (stockMode === "entrada") {
        await backofficeApi.entradaStockProducto({
          productoId: Number(stockForm.productoId),
          cantidad: Number(stockForm.cantidad),
          costoUnitario: Number(stockForm.costoUnitario || 0),
          proveedorId: stockForm.proveedorId ? Number(stockForm.proveedorId) : null,
          numeroFactura: stockForm.numeroFactura || null,
          observaciones: stockForm.observaciones || null,
        });
      } else if (stockMode === "salida") {
        await backofficeApi.salidaStockProducto({
          productoId: Number(stockForm.productoId),
          cantidad: Number(stockForm.cantidad),
          subtipo: stockForm.subtipo,
          observaciones: stockForm.observaciones || null,
        });
      } else {
        await backofficeApi.ajusteStockProducto({
          productoId: Number(stockForm.productoId),
          cantidadNueva: Number(stockForm.cantidadNueva),
          observaciones: stockForm.observaciones || null,
        });
      }
      await loadProducts(selectedCategory);
      setStockModalOpen(false);
      snackbar.success("Movimiento de inventario aplicado.");
      window.dispatchEvent(new CustomEvent("barrest-inventory-updated"));
    } catch (e2) {
      snackbar.error(e2.message || "No se pudo aplicar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  const openGlobalMovements = async () => {
    setSaving(true);
    setError("");
    try {
      const [movRes, prodRes] = await Promise.all([
        backofficeApi.movimientosProductos({ page: 1, pageSize: PAGINATION.MOVIMIENTOS }),
        backofficeApi.listProductos({ page: 1, pageSize: PAGINATION.CATALOG_ALERTS, activos: true }).catch(() => ({ items: [] })),
      ]);
      setMovementRows(Array.isArray(movRes?.items) ? movRes.items : []);
      setMovementProductLookup(Array.isArray(prodRes?.items) ? prodRes.items : []);
      setMovementModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar movimientos.");
    } finally {
      setSaving(false);
    }
  };

  const openProductHistory = async (p) => {
    setSaving(true);
    setError("");
    try {
      const data = await backofficeApi.movimientosProducto(p.id, { limite: 50 });
      setHistoryRows(Array.isArray(data?.movimientos) ? data.movimientos : []);
      setSelectedProductName(p.nombre || "Producto");
      setProductHistoryModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar historial.");
    } finally {
      setSaving(false);
    }
  };

  const categoriaRequiereCocina = (c) => {
    const v = c?.requiereCocina ?? c?.RequiereCocina;
    return v !== false;
  };

  const openEdit = async (id) => {
    setSaving(true);
    setError("");
    try {
      const [p, gruposRaw] = await Promise.all([
        backofficeApi.getProducto(id),
        backofficeApi.listProductoOpcionesGrupos(id).catch(() => null),
      ]);
      const parsed = parseOpcionesEspecialesFromGruposApi(gruposRaw ?? []);
      const lineas = parsed.lineas.length ? parsed.lineas : [""];
      const tieneOpciones = lineas.some((s) => String(s || "").trim());
      setForm({
        id: p.id,
        codigo: p.codigo || "",
        nombre: p.nombre || "",
        descripcion: p.descripcion || "",
        precioVenta: p.precioVenta ?? p.PrecioVenta ?? p.precio ?? p.Precio ?? "",
        precioCompra: p.precioCompra ?? p.PrecioCompra ?? "",
        categoriaProductoId: p.categoriaProductoId || "",
        proveedorId: p.proveedorId ?? p.ProveedorId ?? "",
        stock: p.stock ?? "",
        stockMinimo: p.stockMinimo ?? "",
        controlarStock: Boolean(p.controlarStock),
        activo: p.activo !== false,
        opcionesEspecialesOn: tieneOpciones,
        opcionesEspecialesLines: lineas,
        opcionesEspecialesGrupoId: parsed.grupoId,
      });
      setModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (
      form.opcionesEspecialesOn &&
      !form.opcionesEspecialesLines.some((s) => String(s || "").trim())
    ) {
      snackbar.error("Agrega al menos una opción especial o desactiva el interruptor.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const codigo = resolveProductCodigoForSave(form.codigo, form.nombre, peerCodigos(form.id));
      const body = {
        codigo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: Number(form.precioVenta || 0),
        precioVenta: Number(form.precioVenta || 0),
        precioCompra: Number(form.precioCompra || 0),
        categoriaProductoId: Number(form.categoriaProductoId),
        ...(form.proveedorId ? { proveedorId: Number(form.proveedorId) } : {}),
        stockMinimo: Number(form.stockMinimo || 0),
        controlarStock: Boolean(form.controlarStock),
        activo: Boolean(form.activo),
        ...(form.id ? {} : { stock: Number(form.stock || 0) }),
      };
      let productId = form.id;
      if (form.id) {
        await backofficeApi.updateProducto(form.id, body);
      } else {
        const created = await backofficeApi.createProducto(body);
        productId = created?.id ?? created?.Id ?? null;
      }
      if (productId == null) throw new Error("No se obtuvo el id del producto.");

      const syncRes = await syncOpcionesEspecialesBackend(backofficeApi, productId, {
        habilitado: form.opcionesEspecialesOn,
        nombres: form.opcionesEspecialesLines,
        grupoIdConocido: form.opcionesEspecialesGrupoId,
      });
      if (!syncRes.ok) {
        if (!syncRes.skipped) {
          throw new Error(syncRes.error || "No se pudieron guardar las opciones especiales.");
        }
      }

      await loadProducts(selectedCategory);
      setModalOpen(false);
      if (!syncRes.ok && syncRes.skipped) {
        snackbar.success(
          form.id
            ? "Producto actualizado. Las opciones no se guardaron (revisa API /opciones o permisos de admin)."
            : "Producto creado. Las opciones no se guardaron (revisa API /opciones o permisos de admin)."
        );
      } else {
        snackbar.success(form.id ? "Producto actualizado." : "Producto creado.");
      }
      window.dispatchEvent(new CustomEvent("barrest-inventory-updated"));
    } catch (e2) {
      snackbar.error(e2.message || "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteProducto(id);
      await loadProducts(selectedCategory);
      snackbar.success("Producto eliminado/desactivado.");
      window.dispatchEvent(new CustomEvent("barrest-inventory-updated"));
    } catch (e) {
      snackbar.error(e.message || "No se pudo eliminar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const onCategoryChange = async (value) => {
    setSelectedCategory(value);
    setLoading(true);
    try {
      await loadProducts(value);
    } finally {
      setLoading(false);
    }
  };

  const exportProductsExcel = async () => {
    setSaving(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("categoriaId", selectedCategory);
      if (search) params.set("search", search);
      const url = `${getApiUrl()}/api/v1/productos/exportar-excel${params.toString() ? `?${params.toString()}` : ""}`;
      const token = getToken();
      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("No se pudo exportar productos.");
      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = `productos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(fileUrl);
      snackbar.success("Excel de productos descargado.");
    } catch (e) {
      const msg = e?.message || "No se pudo exportar productos.";
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-7xl space-y-4">
        <StatCardsSkeleton />
        <ListSkeleton rows={8} />
      </div>
    );
  }

  if (categoriesScreen) {
    return (
      <ProductCategoriesView
        onBackToProducts={() => setCategoriesScreen(false)}
        onOpenProducts={async (categoriaId) => {
          setCategoriesScreen(false);
          const id = categoriaId ? String(categoriaId) : "";
          setSelectedCategory(id);
          try {
            await loadProducts(id);
            await reloadCategoriesOnly();
          } catch (e) {
            snackbar.error(e.message || "No se pudo cargar productos.");
          }
        }}
        onCategoriesMutated={reloadCategoriesOnly}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCategoryChange(selectedCategory);
            }}
            placeholder="Buscar por nombre/codigo"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
          />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
          >
            <option value="">Todas las categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre || c.descripcion || `Categoria ${c.id}`}</option>
            ))}
          </select>
          <button onClick={() => onCategoryChange(selectedCategory)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Filtrar
          </button>
          </div>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </button>
        </div>

        <div className="mt-2 overflow-x-auto">
          <div className="flex w-max min-w-full flex-wrap gap-2 md:w-auto md:min-w-0">
          <button
            type="button"
            onClick={() => void openStockModal("entrada")}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
          >
            <PackagePlus className="h-3.5 w-3.5 shrink-0" />
            Entrada Stock
          </button>
          <button
            type="button"
            onClick={() => void openStockModal("salida")}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <PackageMinus className="h-3.5 w-3.5 shrink-0" />
            Salida Stock
          </button>
          <button
            type="button"
            onClick={() => void openStockModal("ajuste")}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            Ajuste Stock
          </button>
          <button
            type="button"
            onClick={openGlobalMovements}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            Ver Movimientos
          </button>
          <button
            type="button"
            onClick={exportProductsExcel}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setCategoriesScreen(true)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
          >
            <Tags className="h-3.5 w-3.5 shrink-0" />
            Categorías
          </button>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filteredProducts.length === 0 && <p className="text-sm text-slate-500">No hay productos disponibles.</p>}
        {filteredProducts.map((p, i) => {
          const stock = Number(p.stock || 0);
          const min = Number(p.stockMinimo || 0);
          const lowStock = Boolean(p.controlarStock) && min > 0 && stock <= min;
          const criticalStock = Boolean(p.controlarStock) && min > 0 && stock <= min * 0.5;
          return (
            <article key={p.id || i} className={`relative flex min-h-[190px] flex-col justify-between rounded-xl border-2 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 ${p.activo === false ? "opacity-50" : "border-slate-200"}`}>
              {lowStock && (
                <div className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold ${criticalStock ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  <TriangleAlert className="h-3 w-3" />
                  {criticalStock ? "CRITICO" : "BAJO"}
                </div>
              )}
              <div>
                <p className="line-clamp-2 text-sm font-semibold text-slate-800">{p.nombre || "Producto"}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{p.categoria || "Sin categoria"}</p>
                {p.codigo && <p className="mt-1 text-[11px] text-slate-400">{p.codigo}</p>}
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-amber-600">{formatCurrency(p.precioVenta ?? p.precio ?? 0, currencySymbol)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Compra: {formatCurrency(p.precioCompra ?? 0, currencySymbol)}</p>
                <p className="mt-1 text-xs text-slate-600">{p.controlarStock ? `Stock: ${stock}` : "Sin control de stock"}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(p.id)}
                    title="Editar"
                    aria-label="Editar producto"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ open: true, type: "product", id: p.id, name: p.nombre || "Producto" })}
                    title="Eliminar"
                    aria-label="Eliminar producto"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => openProductHistory(p)}
                    title="Movimientos"
                    aria-label="Ver movimientos"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                  >
                    <TriangleAlert className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {modalOpen && (
        <BackofficeDialog
          maxWidthClass="max-w-2xl"
          panelClassName="sm:mx-auto"
          onBackdropClick={saving ? undefined : () => setModalOpen(false)}
        >
          <form onSubmit={saveProduct} className="flex w-full min-w-0 flex-col">
            <h3 className="text-base font-semibold leading-tight text-slate-800 sm:text-lg">
              {form.id ? "Editar producto" : "Nuevo producto"}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 sm:items-start sm:gap-x-6 sm:gap-y-3">
              <label className="min-w-0 block text-xs font-semibold text-slate-600">
                Código
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  placeholder="Se generará automáticamente si se deja vacío"
                  className={productModalCodigoFieldClass}
                  autoComplete="off"
                />
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Producto
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre del producto"
                  className={productModalFieldClass}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Precio venta
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.precioVenta}
                  onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))}
                  placeholder="0.00"
                  className={productModalFieldClass}
                  required
                />
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Precio compra
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.precioCompra}
                  onChange={(e) => setForm((f) => ({ ...f, precioCompra: e.target.value }))}
                  placeholder="0.00"
                  className={productModalFieldClass}
                />
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Categoría
                <select
                  value={form.categoriaProductoId}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaProductoId: e.target.value }))}
                  className={productModalFieldClass}
                  required
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((c) => {
                    const label = c.nombre || c.descripcion || `Categoria ${c.id}`;
                    const cocina = categoriaRequiereCocina(c);
                    return (
                      <option key={c.id} value={c.id}>
                        {label}
                        {cocina ? "" : " — solo barra (no cocina)"}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Proveedor
                <select
                  value={form.proveedorId}
                  onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}
                  className={productModalFieldClass}
                >
                  <option value="">Sin proveedor</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre || p.descripcion || `Proveedor ${p.id}`}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Stock actual
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="Stock"
                  className={`${productModalFieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
                  disabled={Boolean(form.id)}
                  title={form.id ? "El stock se ajusta solo desde movimientos de inventario." : undefined}
                />
                {form.id && <p className="mt-1 text-[11px] text-slate-500">El stock se ajusta desde Entrada/Salida/Ajuste.</p>}
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Stock mínimo
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.stockMinimo}
                  onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
                  placeholder="0"
                  className={productModalFieldClass}
                />
              </label>
              <div className="col-span-full grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:col-span-2">
                <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 sm:min-h-0">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-slate-300 sm:h-4 sm:w-4"
                    checked={form.controlarStock}
                    onChange={(e) => setForm((f) => ({ ...f, controlarStock: e.target.checked }))}
                  />
                  Controlar stock
                </label>
                <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 sm:min-h-0">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-slate-300 sm:h-4 sm:w-4"
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  />
                  Activo
                </label>
              </div>

              <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50/90 p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Opciones especiales</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.opcionesEspecialesOn}
                    aria-label={form.opcionesEspecialesOn ? "Desactivar opciones especiales" : "Activar opciones especiales"}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        opcionesEspecialesOn: !f.opcionesEspecialesOn,
                        opcionesEspecialesLines:
                          !f.opcionesEspecialesOn && (!f.opcionesEspecialesLines?.length || f.opcionesEspecialesLines.length === 0)
                            ? [""]
                            : f.opcionesEspecialesLines,
                      }))
                    }
                    className={`inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent px-[3px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
                      form.opcionesEspecialesOn ? "justify-end bg-violet-600" : "justify-start bg-slate-300"
                    }`}
                  >
                    <span className="pointer-events-none h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
                  </button>
                </div>

                {form.opcionesEspecialesOn && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {form.opcionesEspecialesLines.map((line, idx) => (
                      <div key={idx} className="flex min-w-0 items-start gap-2">
                        <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
                          Opción {idx + 1}
                          <input
                            value={line}
                            onChange={(e) =>
                              setForm((f) => {
                                const next = [...f.opcionesEspecialesLines];
                                next[idx] = e.target.value;
                                return { ...f, opcionesEspecialesLines: next };
                              })
                            }
                            placeholder="Ej. Barbacoa"
                            className={productModalFieldClass}
                            autoComplete="off"
                          />
                        </label>
                        <button
                          type="button"
                          title="Quitar"
                          aria-label="Quitar opción"
                          disabled={form.opcionesEspecialesLines.length <= 1}
                          onClick={() =>
                            setForm((f) => {
                              const next = f.opcionesEspecialesLines.filter((_, j) => j !== idx);
                              return { ...f, opcionesEspecialesLines: next.length ? next : [""] };
                            })
                          }
                          className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, opcionesEspecialesLines: [...f.opcionesEspecialesLines, ""] }))
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 sm:min-h-0 sm:w-auto sm:py-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar otra opción
                    </button>
                  </div>
                )}
              </div>
            </div>
            <label className="mt-4 block min-w-0 text-xs font-semibold text-slate-600 sm:mt-3">
              Descripción
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Información adicional del producto"
                className={productModalTextareaClass}
                rows={3}
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:mt-5 sm:flex-row sm:justify-end sm:border-0 sm:pt-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-12 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 touch-manipulation sm:min-h-0 sm:w-auto sm:py-2 sm:text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white touch-manipulation disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2 sm:text-xs"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </BackofficeDialog>
      )}

      {stockModalOpen && (
        <BackofficeDialog
          maxWidthClass="max-w-lg"
          onBackdropClick={saving || stockModalLoading ? undefined : () => setStockModalOpen(false)}
        >
          <form onSubmit={submitStockAction} className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">
              {stockMode === "entrada" ? "Entrada de stock" : stockMode === "salida" ? "Salida de stock" : "Ajuste de stock"}
            </h3>

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Buscar producto
              <span className="ml-1 font-normal text-slate-400">(solo con control de stock)</span>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoComplete="off"
                  value={stockProductQuery}
                  onChange={(e) => {
                    setStockProductQuery(e.target.value);
                    setStockForm((f) => ({ ...f, productoId: "" }));
                    setStockSuggestOpen(true);
                  }}
                  onFocus={() => {
                    if (stockSuggestBlurTimerRef.current) {
                      window.clearTimeout(stockSuggestBlurTimerRef.current);
                      stockSuggestBlurTimerRef.current = null;
                    }
                    setStockSuggestOpen(true);
                  }}
                  onBlur={() => {
                    stockSuggestBlurTimerRef.current = window.setTimeout(() => {
                      setStockSuggestOpen(false);
                      stockSuggestBlurTimerRef.current = null;
                    }, 200);
                  }}
                  placeholder="Nombre o código…"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
                />
                {stockSuggestOpen && stockProductQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
                    {stockModalLoading ? (
                      <p className="px-3 py-2 text-sm text-slate-500">Cargando…</p>
                    ) : stockAutocompleteList.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</p>
                    ) : (
                      <ul className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                        {stockAutocompleteList.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setStockForm((f) => ({ ...f, productoId: String(p.id) }));
                                setStockProductQuery(p.nombre || "");
                                setStockSuggestOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <span className="font-medium text-slate-800">{p.nombre}</span>
                              <span className="block text-xs text-slate-500">
                                {p.codigo ? `${p.codigo} · ` : ""}Stock {p.stock ?? 0}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {stockModalLoading && stockProductQuery.trim().length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">Cargando catálogo…</p>
              )}
              {!stockModalLoading && stockModalProductCount === 0 && (
                <p className="mt-2 text-xs text-amber-700">No hay productos con control de stock activo.</p>
              )}
              {stockForm.productoId && selectedStockProduct && (
                <p className="mt-1 text-xs text-slate-500">
                  Seleccionado · stock {selectedStockProduct.stock ?? 0}
                  {selectedStockProduct.codigo ? ` · ${selectedStockProduct.codigo}` : ""}
                </p>
              )}
            </label>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {stockMode !== "ajuste" && (
                <label className="text-xs font-semibold text-slate-600">
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    value={stockForm.cantidad}
                    onChange={(e) => setStockForm((f) => ({ ...f, cantidad: e.target.value }))}
                    placeholder="Unidades"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
              )}

              {stockMode === "entrada" && (
                <label className="text-xs font-semibold text-slate-600">
                  Costo unitario ({currencySymbol})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.costoUnitario}
                    onChange={(e) => setStockForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              )}

              {stockMode === "salida" && (
                <label className="text-xs font-semibold text-slate-600">
                  Motivo
                  <select
                    value={stockForm.subtipo}
                    onChange={(e) => setStockForm((f) => ({ ...f, subtipo: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option>Daño</option>
                    <option>Merma</option>
                    <option>Transferencia</option>
                    <option>Ajuste</option>
                  </select>
                </label>
              )}

              {stockMode === "ajuste" && (
                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Nueva cantidad en inventario
                  <input
                    type="number"
                    min="0"
                    value={stockForm.cantidadNueva}
                    onChange={(e) => setStockForm((f) => ({ ...f, cantidadNueva: e.target.value }))}
                    placeholder="Cantidad física"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
              )}

              {stockMode === "entrada" && (
                <>
                  <label className="text-xs font-semibold text-slate-600">
                    Proveedor
                    <select
                      value={stockForm.proveedorId}
                      onChange={(e) => setStockForm((f) => ({ ...f, proveedorId: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Sin proveedor</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre || p.razonSocial || `Proveedor ${p.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Número de factura
                    <input
                      value={stockForm.numeroFactura}
                      onChange={(e) => setStockForm((f) => ({ ...f, numeroFactura: e.target.value }))}
                      placeholder="Opcional"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              )}

              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                Observaciones
                <textarea
                  value={stockForm.observaciones}
                  onChange={(e) => setStockForm((f) => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Opcional"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStockModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">
                Cancelar
              </button>
              <button type="submit" disabled={saving || stockModalLoading} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </BackofficeDialog>
      )}

      {movementModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-3xl" onBackdropClick={() => setMovementModalOpen(false)}>
          <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">Movimientos globales</h3>
            <p className="mt-1 text-xs text-slate-500">Últimos registros (hasta 200). El nombre sale del catálogo si el API solo manda el id.</p>
            <div className="mt-3 max-h-[min(55dvh,60vh)] overflow-auto rounded-lg border border-slate-200">
              {movementRows.length === 0 && <p className="p-4 text-sm text-slate-500">Sin movimientos.</p>}
              {movementRows.length > 0 && (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2">Producto</th>
                      <th className="border-b border-slate-200 px-3 py-2">Tipo</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Cantidad</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Stock</th>
                      <th className="border-b border-slate-200 px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementRows.map((m, i) => {
                      const tipo = m.tipo ?? m.Tipo ?? "Movimiento";
                      const sub = m.subtipo ?? m.Subtipo;
                      const cant = m.cantidad ?? m.Cantidad;
                      const ant = m.stockAnterior ?? m.StockAnterior;
                      const nue = m.stockNuevo ?? m.StockNuevo;
                      const pid = movementProductId(m);
                      const name = movementProductLabel(m, movementProductLookup.length > 0 ? movementProductLookup : products);
                      const fecha = formatMovementDate(m);
                      const isEntrada = String(tipo).toLowerCase().includes("entrada");
                      return (
                        <tr key={m.id ?? m.Id ?? i} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-900">{name}</span>
                            {pid != null && <span className="ml-1 text-xs text-slate-400">#{pid}</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className={isEntrada ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{tipo}</span>
                            {sub && sub !== "-" ? <span className="block text-xs font-normal text-slate-500">{sub}</span> : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-800">{cant}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                            {ant} → {nue}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fecha ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setMovementModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">
                Cerrar
              </button>
            </div>
          </div>
        </BackofficeDialog>
      )}

      {productHistoryModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-3xl" onBackdropClick={() => setProductHistoryModalOpen(false)}>
          <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">Historial: {selectedProductName}</h3>
            <div className="mt-3 max-h-[min(55dvh,60vh)] overflow-auto rounded-lg border border-slate-200">
              {historyRows.length === 0 && <p className="p-4 text-sm text-slate-500">Sin movimientos para este producto.</p>}
              {historyRows.length > 0 && (
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2">Tipo</th>
                      <th className="border-b border-slate-200 px-3 py-2">Detalle</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Cantidad</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-right">Stock</th>
                      <th className="border-b border-slate-200 px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRows.map((m, i) => {
                      const tipo = m.tipo ?? m.Tipo ?? "Movimiento";
                      const sub = m.subtipo ?? m.Subtipo;
                      const cant = m.cantidad ?? m.Cantidad;
                      const ant = m.stockAnterior ?? m.StockAnterior;
                      const nue = m.stockNuevo ?? m.StockNuevo;
                      const fecha = formatMovementDate(m);
                      const isEntrada = String(tipo).toLowerCase().includes("entrada");
                      return (
                        <tr key={m.id ?? m.Id ?? i} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2">
                            <span className={isEntrada ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{tipo}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{sub && sub !== "-" ? sub : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{cant}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                            {ant} → {nue}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fecha ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setProductHistoryModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cerrar</button>
            </div>
          </div>
        </BackofficeDialog>
      )}
      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false, type: "", id: null, name: "" })}
        onConfirm={async () => {
          if (confirmAction.type === "product" && confirmAction.id) await removeProduct(confirmAction.id);
        }}
        title="Confirmar eliminación"
        message={
          confirmAction.type === "product"
            ? `¿Eliminar producto "${confirmAction.name}"?`
            : "¿Confirmas esta acción?"
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}

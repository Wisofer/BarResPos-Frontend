import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, History, PackageMinus, PackagePlus, Plus, Search, SlidersHorizontal, Tags } from "lucide-react";
import { PAGINATION } from "../constants/pagination.js";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficePageShell, BackofficeStatCardsListSkeleton } from "../components/index.js";
import { GlobalMovementsModal, ProductHistoryModal } from "../components/inventory/InventoryHistoryModals.jsx";
import { ProductFormModal } from "../components/inventory/ProductFormModal.jsx";
import { ProductGrid } from "../components/inventory/ProductGrid.jsx";
import { StockMovementModal } from "../components/inventory/StockMovementModal.jsx";
import { formatCurrency } from "../utils/currency.js";
import { tieneControlStock } from "../utils/inventoryMovementsView.js";
import { getInitialProductForm, getNewProductForm } from "../utils/productFormDefaults.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { ProductCategoriesView } from "./ProductCategoriesView.jsx";
import { PROVIDERS_UPDATED_EVENT } from "../providers/constants.js";
import { resolveProductCodigoForSave } from "../utils/productCodigo.js";
import {
  parseOpcionesEspecialesFromGruposApi,
  syncOpcionesEspecialesBackend,
} from "../utils/productoOpcionesEspecialesSync.js";

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
  const [form, setForm] = useState(getInitialProductForm);
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
  const [imageUploadFile, setImageUploadFile] = useState(null);
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

  const movementLabelProductList = useMemo(
    () => (movementProductLookup.length > 0 ? movementProductLookup : products),
    [movementProductLookup, products]
  );

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
    setForm(
      getNewProductForm({
        selectedCategory,
        categories,
        providers,
      })
    );
    setImageUploadFile(null);
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
        esPreparado: Boolean(p.esPreparado ?? p.EsPreparado ?? true),
        imagenUrl: p.imagenUrl ?? p.ImagenUrl ?? "",
        activo: p.activo !== false,
        opcionesEspecialesOn: tieneOpciones,
        opcionesEspecialesLines: lineas,
        opcionesEspecialesGrupoId: parsed.grupoId,
      });
      setImageUploadFile(null);
      setModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (imageUploadFile && !form.esPreparado) {
      snackbar.error("Para subir imagen, el producto debe tener activado 'Es preparado (cocina)'.");
      return;
    }
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
        esPreparado: Boolean(form.esPreparado),
        imagenUrl: String(form.imagenUrl || "").trim() || null,
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

      // Si el usuario seleccionó archivo, priorizamos subida real al endpoint /imagen.
      if (imageUploadFile) {
        await backofficeApi.subirImagenProducto(productId, imageUploadFile);
      }

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
      setImageUploadFile(null);
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
      const blob = await backofficeApi.exportProductosExcel({
        ...(selectedCategory ? { categoriaId: selectedCategory } : {}),
        ...(search ? { search } : {}),
      });
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
    return <BackofficeStatCardsListSkeleton listRows={8} />;
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
    <BackofficePageShell maxWidth="7xl" className="min-w-0 space-y-4 pb-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Inventario de productos</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCategoryChange(selectedCategory);
              }}
              placeholder="Buscar por nombre o código…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre || c.descripcion || `Categoria ${c.id}`}</option>
            ))}
          </select>
          <button onClick={() => onCategoryChange(selectedCategory)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Filtrar
          </button>
          </div>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-primary-700">
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

      <ProductGrid
        products={filteredProducts}
        currencySymbol={currencySymbol}
        openEdit={openEdit}
        openProductHistory={openProductHistory}
        setConfirmAction={setConfirmAction}
      />
      {modalOpen && (
        <ProductFormModal
          saving={saving}
          form={form}
          setForm={setForm}
          onSubmit={saveProduct}
          onRequestClose={() => {
            setModalOpen(false);
            setImageUploadFile(null);
          }}
          categories={categories}
          providers={providers}
          imageUploadFile={imageUploadFile}
          setImageUploadFile={setImageUploadFile}
        />
      )}

      <StockMovementModal
        stockModalOpen={stockModalOpen}
        setStockModalOpen={setStockModalOpen}
        saving={saving}
        stockModalLoading={stockModalLoading}
        stockMode={stockMode}
        submitStockAction={submitStockAction}
        stockProductQuery={stockProductQuery}
        setStockProductQuery={setStockProductQuery}
        stockSuggestOpen={stockSuggestOpen}
        setStockSuggestOpen={setStockSuggestOpen}
        stockSuggestBlurTimerRef={stockSuggestBlurTimerRef}
        stockAutocompleteList={stockAutocompleteList}
        selectedStockProduct={selectedStockProduct}
        stockForm={stockForm}
        setStockForm={setStockForm}
        providers={providers}
        currencySymbol={currencySymbol}
        stockModalProductCount={stockModalProductCount}
      />
      <GlobalMovementsModal
        open={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        movementRows={movementRows}
        productListForLabel={movementLabelProductList}
      />
      <ProductHistoryModal
        open={productHistoryModalOpen}
        onClose={() => setProductHistoryModalOpen(false)}
        historyRows={historyRows}
        selectedProductName={selectedProductName}
      />
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
    </BackofficePageShell>
  );
}

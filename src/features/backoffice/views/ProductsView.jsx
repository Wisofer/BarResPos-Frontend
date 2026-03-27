import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton, StatCardsSkeleton } from "../components/index.js";
import { formatCurrency } from "../utils/currency.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

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
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [providersModalOpen, setProvidersModalOpen] = useState(false);
  const [movementRows, setMovementRows] = useState([]);
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
  const [categoryForm, setCategoryForm] = useState({
    id: null,
    nombre: "",
    descripcion: "",
    colorHex: "#3B82F6",
    iconoNombre: "",
    orden: 1,
    activo: true,
  });
  const [providerForm, setProviderForm] = useState({
    id: null,
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    contacto: "",
    observaciones: "",
    activo: true,
  });
  const [confirmAction, setConfirmAction] = useState({ open: false, type: "", id: null, name: "" });

  const loadProducts = async (categoriaId = selectedCategory) => {
    const data = await backofficeApi.listProductos({
      page: 1,
      pageSize: 120,
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

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => String(p.categoriaProductoId || "") === String(selectedCategory));
  }, [products, selectedCategory]);

  const openCreate = () => {
    setForm({
      id: null,
      codigo: "",
      nombre: "",
      descripcion: "",
      precioVenta: "",
      precioCompra: "",
      categoriaProductoId: categories[0]?.id || "",
      proveedorId: providers[0]?.id || "",
      stock: "",
      stockMinimo: "",
      controlarStock: true,
      activo: true,
    });
    setModalOpen(true);
  };

  const openStockModal = (mode) => {
    setStockMode(mode);
    setStockForm({
      productoId: filteredProducts[0]?.id || "",
      cantidad: "",
      costoUnitario: "",
      proveedorId: providers[0]?.id || "",
      numeroFactura: "",
      subtipo: "Daño",
      cantidadNueva: "",
      observaciones: "",
    });
    setStockModalOpen(true);
  };

  const submitStockAction = async (e) => {
    e.preventDefault();
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
    } catch (e2) {
      setError(e2.message || "No se pudo aplicar el movimiento.");
      snackbar.error(e2.message || "No se pudo aplicar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  const openGlobalMovements = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await backofficeApi.movimientosProductos({ page: 1, pageSize: 100 });
      setMovementRows(Array.isArray(data?.items) ? data.items : []);
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

  const openCategoriesModal = () => {
    setCategoryForm({ id: null, nombre: "", descripcion: "", colorHex: "#3B82F6", iconoNombre: "", orden: 1, activo: true });
    setCategoriesModalOpen(true);
  };

  const openProvidersModal = () => {
    setProviderForm({ id: null, nombre: "", telefono: "", email: "", direccion: "", contacto: "", observaciones: "", activo: true });
    setProvidersModalOpen(true);
  };

  const editCategory = async (id) => {
    setSaving(true);
    setError("");
    try {
      const c = await backofficeApi.getCategoriaProducto(id);
      setCategoryForm({
        id: c.id,
        nombre: c.nombre || "",
        descripcion: c.descripcion || "",
        colorHex: c.colorHex || "#3B82F6",
        iconoNombre: c.iconoNombre || "",
        orden: c.orden || 1,
        activo: c.activo !== false,
      });
      setCategoriesModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        nombre: categoryForm.nombre,
        descripcion: categoryForm.descripcion || null,
        colorHex: categoryForm.colorHex || "#3B82F6",
        iconoNombre: categoryForm.iconoNombre || null,
        orden: Number(categoryForm.orden || 1),
        activo: Boolean(categoryForm.activo),
      };
      if (categoryForm.id) await backofficeApi.updateCategoriaProducto(categoryForm.id, body);
      else await backofficeApi.createCategoriaProducto(body);
      const cat = await backofficeApi.catalogoCategoriasProducto();
      setCategories(Array.isArray(cat) ? cat : cat?.items || []);
      setCategoryForm({ id: null, nombre: "", descripcion: "", colorHex: "#3B82F6", iconoNombre: "", orden: 1, activo: true });
      snackbar.success("Categoria guardada.");
    } catch (e2) {
      setError(e2.message || "No se pudo guardar categoria.");
      snackbar.error(e2.message || "No se pudo guardar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteCategoriaProducto(id);
      const cat = await backofficeApi.catalogoCategoriasProducto();
      setCategories(Array.isArray(cat) ? cat : cat?.items || []);
      snackbar.success("Categoria desactivada.");
    } catch (e) {
      setError(e.message || "No se pudo eliminar categoria.");
      snackbar.error(e.message || "No se pudo eliminar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const editProvider = async (id) => {
    setSaving(true);
    setError("");
    try {
      const p = await backofficeApi.getProveedor(id);
      setProviderForm({
        id: p.id,
        nombre: p.nombre || "",
        telefono: p.telefono || "",
        email: p.email || "",
        direccion: p.direccion || "",
        contacto: p.contacto || "",
        observaciones: p.observaciones || "",
        activo: p.activo !== false,
      });
      setProvidersModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const saveProvider = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        nombre: providerForm.nombre,
        telefono: providerForm.telefono || null,
        email: providerForm.email || null,
        direccion: providerForm.direccion || null,
        contacto: providerForm.contacto || null,
        observaciones: providerForm.observaciones || null,
        activo: Boolean(providerForm.activo),
      };
      if (providerForm.id) await backofficeApi.updateProveedor(providerForm.id, body);
      else await backofficeApi.createProveedor(body);
      const prov = await backofficeApi.catalogoProveedores();
      setProviders(Array.isArray(prov) ? prov : prov?.items || []);
      setProviderForm({ id: null, nombre: "", telefono: "", email: "", direccion: "", contacto: "", observaciones: "", activo: true });
      snackbar.success("Proveedor guardado.");
    } catch (e2) {
      setError(e2.message || "No se pudo guardar proveedor.");
      snackbar.error(e2.message || "No se pudo guardar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const removeProvider = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteProveedor(id);
      const prov = await backofficeApi.catalogoProveedores();
      setProviders(Array.isArray(prov) ? prov : prov?.items || []);
      snackbar.success("Proveedor desactivado.");
    } catch (e) {
      setError(e.message || "No se pudo eliminar proveedor.");
      snackbar.error(e.message || "No se pudo eliminar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (id) => {
    setSaving(true);
    setError("");
    try {
      const p = await backofficeApi.getProducto(id);
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
    setSaving(true);
    setError("");
    try {
      const body = {
        codigo: form.codigo,
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
      if (form.id) await backofficeApi.updateProducto(form.id, body);
      else await backofficeApi.createProducto(body);
      await loadProducts(selectedCategory);
      setModalOpen(false);
      snackbar.success(form.id ? "Producto actualizado." : "Producto creado.");
    } catch (e2) {
      setError(e2.message || "No se pudo guardar el producto.");
      snackbar.error(e2.message || "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id, nombre) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteProducto(id);
      await loadProducts(selectedCategory);
      snackbar.success("Producto eliminado/desactivado.");
    } catch (e) {
      setError(e.message || "No se pudo eliminar el producto.");
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
      setError(msg);
      snackbar.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <StatCardsSkeleton />
        <ListSkeleton rows={8} />
      </>
    );
  }
  return (
    <>
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
          <button onClick={() => openStockModal("entrada")} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Entrada Stock</button>
          <button onClick={() => openStockModal("salida")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Salida Stock</button>
          <button onClick={() => openStockModal("ajuste")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Ajuste Stock</button>
          <button onClick={openGlobalMovements} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Ver Movimientos</button>
          <button onClick={exportProductsExcel} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </button>
          <button onClick={openCategoriesModal} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700">Categorías</button>
          <button onClick={openProvidersModal} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700">Proveedores</button>
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
                <p className="mt-1 text-xs text-slate-600">{Boolean(p.controlarStock) ? `Stock: ${stock}` : "Sin control de stock"}</p>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <form onSubmit={saveProduct} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800">{form.id ? "Editar producto" : "Nuevo producto"}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Código
                <input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ej: REF-AGUA-001" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Producto
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del producto" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Precio venta
                <input type="number" step="0.01" value={form.precioVenta} onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))} placeholder="0.00" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Precio compra
                <input type="number" step="0.01" value={form.precioCompra} onChange={(e) => setForm((f) => ({ ...f, precioCompra: e.target.value }))} placeholder="0.00" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Categoría
                <select value={form.categoriaProductoId} onChange={(e) => setForm((f) => ({ ...f, categoriaProductoId: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Selecciona categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre || c.descripcion || `Categoria ${c.id}`}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Proveedor
                <select value={form.proveedorId} onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Sin proveedor</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre || p.descripcion || `Proveedor ${p.id}`}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Stock actual
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="Stock"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={Boolean(form.id)}
                  title={form.id ? "El stock se ajusta solo desde movimientos de inventario." : undefined}
                />
                {form.id && <p className="mt-1 text-[11px] font-normal text-slate-500">El stock se ajusta desde Entrada/Salida/Ajuste.</p>}
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Stock mínimo
                <input type="number" value={form.stockMinimo} onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))} placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="inline-flex items-center gap-2 pt-1 text-sm text-slate-700">
                <input type="checkbox" checked={form.controlarStock} onChange={(e) => setForm((f) => ({ ...f, controlarStock: e.target.checked }))} />
                Controlar stock
              </label>
              <label className="inline-flex items-center gap-2 pt-1 text-sm text-slate-700">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
                Activo
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Descripción
              <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Información adicional del producto" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
              <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}

      {stockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <form onSubmit={submitStockAction} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800">
              {stockMode === "entrada" ? "Entrada de stock" : stockMode === "salida" ? "Salida de stock" : "Ajuste de stock"}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <select value={stockForm.productoId} onChange={(e) => setStockForm((f) => ({ ...f, productoId: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                <option value="">Producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {stockMode !== "ajuste" && (
                <input type="number" min="1" value={stockForm.cantidad} onChange={(e) => setStockForm((f) => ({ ...f, cantidad: e.target.value }))} placeholder="Cantidad" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              )}
              {stockMode === "ajuste" && (
                <input type="number" min="0" value={stockForm.cantidadNueva} onChange={(e) => setStockForm((f) => ({ ...f, cantidadNueva: e.target.value }))} placeholder="Cantidad nueva" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              )}
              {stockMode === "entrada" && (
                <>
                  <input type="number" min="0" step="0.01" value={stockForm.costoUnitario} onChange={(e) => setStockForm((f) => ({ ...f, costoUnitario: e.target.value }))} placeholder="Costo unitario" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <select value={stockForm.proveedorId} onChange={(e) => setStockForm((f) => ({ ...f, proveedorId: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Proveedor</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre || p.razonSocial || `Proveedor ${p.id}`}</option>
                    ))}
                  </select>
                  <input value={stockForm.numeroFactura} onChange={(e) => setStockForm((f) => ({ ...f, numeroFactura: e.target.value }))} placeholder="Numero factura" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </>
              )}
              {stockMode === "salida" && (
                <select value={stockForm.subtipo} onChange={(e) => setStockForm((f) => ({ ...f, subtipo: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                  <option>Daño</option>
                  <option>Merma</option>
                  <option>Transferencia</option>
                  <option>Ajuste</option>
                </select>
              )}
              <textarea value={stockForm.observaciones} onChange={(e) => setStockForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Observaciones" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setStockModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
              <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">{saving ? "Procesando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}

      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800">Movimientos globales</h3>
            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto">
              {movementRows.length === 0 && <p className="text-sm text-slate-500">Sin movimientos.</p>}
              {movementRows.map((m, i) => (
                <div key={m.id || i} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {m.tipo || "Movimiento"} | Producto: {m.productoNombre || m.productoId} | Cantidad: {m.cantidad} | Stock: {m.stockAnterior} → {m.stockNuevo}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setMovementModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {productHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800">Historial: {selectedProductName}</h3>
            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto">
              {historyRows.length === 0 && <p className="text-sm text-slate-500">Sin movimientos para este producto.</p>}
              {historyRows.map((m, i) => (
                <div key={m.id || i} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {m.tipo || "Movimiento"} | {m.subtipo || "-"} | Cantidad: {m.cantidad} | Stock: {m.stockAnterior} → {m.stockNuevo}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setProductHistoryModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {categoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Categorías</h3>
              <button onClick={() => setCategoriesModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cerrar</button>
            </div>
            <form onSubmit={saveCategory} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input value={categoryForm.nombre} onChange={(e) => setCategoryForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={categoryForm.descripcion} onChange={(e) => setCategoryForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripcion" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={categoryForm.colorHex} onChange={(e) => setCategoryForm((f) => ({ ...f, colorHex: e.target.value }))} placeholder="#3B82F6" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={categoryForm.iconoNombre} onChange={(e) => setCategoryForm((f) => ({ ...f, iconoNombre: e.target.value }))} placeholder="Icono" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" min="1" value={categoryForm.orden} onChange={(e) => setCategoryForm((f) => ({ ...f, orden: e.target.value }))} placeholder="Orden" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={categoryForm.activo} onChange={(e) => setCategoryForm((f) => ({ ...f, activo: e.target.checked }))} /> Activo</label>
              <div className="md:col-span-3 flex justify-end gap-2">
                <button type="button" onClick={() => setCategoryForm({ id: null, nombre: "", descripcion: "", colorHex: "#3B82F6", iconoNombre: "", orden: 1, activo: true })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Limpiar</button>
                <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">{saving ? "Guardando..." : "Guardar categoría"}</button>
              </div>
            </form>
            <div className="mt-4 max-h-[45vh] space-y-2 overflow-auto">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-500">{c.descripcion || "Sin descripcion"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editCategory(c.id)} className="rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white">Editar</button>
                    <button onClick={() => setConfirmAction({ open: true, type: "category", id: c.id, name: c.nombre || "Categoría" })} className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {providersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Proveedores</h3>
              <button onClick={() => setProvidersModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cerrar</button>
            </div>
            <form onSubmit={saveProvider} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={providerForm.nombre} onChange={(e) => setProviderForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={providerForm.contacto} onChange={(e) => setProviderForm((f) => ({ ...f, contacto: e.target.value }))} placeholder="Contacto" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={providerForm.telefono} onChange={(e) => setProviderForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="Telefono" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="email" value={providerForm.email} onChange={(e) => setProviderForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={providerForm.direccion} onChange={(e) => setProviderForm((f) => ({ ...f, direccion: e.target.value }))} placeholder="Direccion" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <textarea value={providerForm.observaciones} onChange={(e) => setProviderForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Observaciones" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" rows={2} />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={providerForm.activo} onChange={(e) => setProviderForm((f) => ({ ...f, activo: e.target.checked }))} /> Activo</label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setProviderForm({ id: null, nombre: "", telefono: "", email: "", direccion: "", contacto: "", observaciones: "", activo: true })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Limpiar</button>
                <button disabled={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">{saving ? "Guardando..." : "Guardar proveedor"}</button>
              </div>
            </form>
            <div className="mt-4 max-h-[45vh] space-y-2 overflow-auto">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.telefono || "-"} | {p.email || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editProvider(p.id)} className="rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white">Editar</button>
                    <button onClick={() => setConfirmAction({ open: true, type: "provider", id: p.id, name: p.nombre || "Proveedor" })} className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmAction.open}
        onClose={() => setConfirmAction({ open: false, type: "", id: null, name: "" })}
        onConfirm={async () => {
          if (confirmAction.type === "product" && confirmAction.id) await removeProduct(confirmAction.id, confirmAction.name);
          if (confirmAction.type === "category" && confirmAction.id) await removeCategory(confirmAction.id);
          if (confirmAction.type === "provider" && confirmAction.id) await removeProvider(confirmAction.id);
        }}
        title="Confirmar eliminación"
        message={
          confirmAction.type === "product"
            ? `¿Eliminar producto "${confirmAction.name}"?`
            : confirmAction.type === "category"
              ? "¿Desactivar categoria?"
              : confirmAction.type === "provider"
                ? "¿Desactivar proveedor?"
                : "¿Confirmas esta acción?"
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </>
  );
}

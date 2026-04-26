function emptyProductFormCore() {
  return {
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
    /** true = comida en cocina; no se devuelve stock al cancelar pedido */
    esPreparado: true,
    imagenUrl: "",
    activo: true,
    opcionesEspecialesOn: false,
    opcionesEspecialesLines: [""],
    opcionesEspecialesGrupoId: null,
  };
}

/** Estado inicial del formulario (p. ej. `useState(getInitialProductForm)`). */
export function getInitialProductForm() {
  return emptyProductFormCore();
}

/**
 * Formulario vacío al abrir "Nuevo producto" (categoría/proveedor por contexto del catálogo).
 * @param {{ selectedCategory: string, categories: unknown[], providers: unknown[] }} ctx
 */
export function getNewProductForm({ selectedCategory, categories, providers }) {
  return {
    ...emptyProductFormCore(),
    categoriaProductoId: selectedCategory || categories[0]?.id || "",
    proveedorId: providers[0]?.id || "",
  };
}

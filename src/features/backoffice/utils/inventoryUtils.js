export function normalizeMovementRow(row) {
  const r = row || {};
  const productoStr =
    typeof r.producto === "string"
      ? r.producto
      : typeof r.Producto === "string"
        ? r.Producto
        : "";
  const productoNombre =
    r.productoNombre ??
    r.ProductoNombre ??
    (productoStr || undefined) ??
    (typeof r.producto === "object" && r.producto != null ? r.producto.nombre ?? r.producto.Nombre : undefined) ??
    (typeof r.Producto === "object" && r.Producto != null ? r.Producto.nombre ?? r.Producto.Nombre : undefined) ??
    "";
  return {
    id: r.id ?? r.Id ?? null,
    fecha: r.fecha ?? r.Fecha ?? r.createdAt ?? r.CreatedAt ?? "",
    productoId: r.productoId ?? r.ProductoId ?? r.producto?.id ?? r.Producto?.id ?? null,
    productoNombre,
    tipo: r.tipo ?? r.Tipo ?? r.subtipo ?? r.Subtipo ?? "",
    subtipo: r.subtipo ?? r.Subtipo ?? "",
    cantidad: Number(r.cantidad ?? r.Cantidad ?? 0),
    cantidadNueva: r.cantidadNueva ?? r.CantidadNueva ?? null,
  };
}

export function normalizeMovementRow(row) {
  const r = row || {};
  return {
    id: r.id ?? r.Id ?? null,
    fecha: r.fecha ?? r.Fecha ?? r.createdAt ?? r.CreatedAt ?? "",
    productoId: r.productoId ?? r.ProductoId ?? r.producto?.id ?? null,
    productoNombre: r.productoNombre ?? r.ProductoNombre ?? r.producto?.nombre ?? r.Producto ?? "",
    tipo: r.tipo ?? r.Tipo ?? r.subtipo ?? r.Subtipo ?? "",
    subtipo: r.subtipo ?? r.Subtipo ?? "",
    cantidad: Number(r.cantidad ?? r.Cantidad ?? 0),
    cantidadNueva: r.cantidadNueva ?? r.CantidadNueva ?? null,
  };
}

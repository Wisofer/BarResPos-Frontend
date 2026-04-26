/** Solo productos con control de stock tienen movimientos de inventario en POS/backend. */
export function tieneControlStock(p) {
  return Boolean(p?.controlarStock ?? p?.ControlarStock);
}

export function movementProductId(m) {
  return m?.productoId ?? m?.ProductoId ?? m?.producto?.id ?? m?.Producto?.Id ?? null;
}

export function movementProductLabel(m, productList) {
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

export function formatMovementDate(m) {
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

/** Normaliza tipo de movimiento (API en distintos formatos) para colores y signos. */
export function movementTipoKind(m) {
  const t = String(m?.tipo ?? m?.Tipo ?? "").toLowerCase();
  if (t.includes("entrada")) return "entrada";
  if (t.includes("salida")) return "salida";
  if (t.includes("ajuste")) return "ajuste";
  return "otro";
}

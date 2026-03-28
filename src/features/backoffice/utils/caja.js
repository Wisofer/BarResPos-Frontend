/**
 * Normaliza respuestas de caja (.NET suele serializar en PascalCase).
 */

export function pickFirstFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Monto a mostrar en filas de historial (real contado, o totales que envíe el API). */
export function cierreHistorialMontoPrincipal(item) {
  const n = pickFirstFiniteNumber(item, [
    "montoReal",
    "MontoReal",
    "montoContado",
    "MontoContado",
    "montoCierre",
    "MontoCierre",
    "total",
    "Total",
    "montoEsperado",
    "MontoEsperado",
    "totalVentas",
    "TotalVentas",
    "totalEfectivo",
    "TotalEfectivo",
  ]);
  return n ?? 0;
}

export function cierreHistorialTotalVentas(item) {
  const n = pickFirstFiniteNumber(item, [
    "totalVentas",
    "TotalVentas",
    "totalVenta",
    "TotalVenta",
    "ventasTotal",
    "VentasTotal",
    "total",
    "Total",
  ]);
  return n ?? 0;
}

export function cierreFechaRaw(item) {
  if (!item || typeof item !== "object") return "";
  return (
    item.fechaCierre ??
    item.FechaCierre ??
    item.fecha ??
    item.Fecha ??
    item.createdAt ??
    item.CreatedAt ??
    item.fechaApertura ??
    item.FechaApertura ??
    ""
  );
}

export function cierreId(item) {
  if (!item || typeof item !== "object") return undefined;
  const v = item.id ?? item.Id;
  return v != null ? v : undefined;
}

export function cierreDetalleMontoEsperado(d) {
  return pickFirstFiniteNumber(d || {}, ["montoEsperado", "MontoEsperado", "totalEsperado", "TotalEsperado"]) ?? 0;
}

export function cierreDetalleMontoReal(d) {
  return pickFirstFiniteNumber(d || {}, ["montoReal", "MontoReal", "montoContado", "MontoContado"]) ?? 0;
}

export function cierreDetalleDiferencia(d) {
  const explicit = pickFirstFiniteNumber(d || {}, ["diferencia", "Diferencia"]);
  if (explicit != null) return explicit;
  const esp = cierreDetalleMontoEsperado(d);
  const real = cierreDetalleMontoReal(d);
  return real - esp;
}

/**
 * Normaliza respuestas de caja (.NET suele serializar en PascalCase).
 */

/**
 * GET /api/v1/caja/cierre/{id} devuelve `{ cierre, pagos }` (BarRestPOS CajaApiController).
 * El detalle de UI espera un objeto plano con id, montoInicial, totalGeneral, etc. en la raíz.
 */
export function normalizarDetalleCierreResponse(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const nested = raw.Cierre ?? raw.cierre;
  if (nested && typeof nested === "object") {
    return { ...nested, id: nested.id ?? nested.Id };
  }
  return raw;
}

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
    "totalGeneral",
    "TotalGeneral",
    "totalVenta",
    "TotalVenta",
    "ventasTotal",
    "VentasTotal",
    "total",
    "Total",
  ]);
  return n ?? 0;
}

export function cierreHistorialMontoInicial(item) {
  return pickFirstFiniteNumber(item, ["montoInicial", "MontoInicial"]) ?? 0;
}

export function cierreHistorialMontoEsperado(item) {
  return pickFirstFiniteNumber(item, ["montoEsperado", "MontoEsperado"]) ?? 0;
}

/** Contado en caja (arqueo físico); puede ser null si el turno sigue abierto. */
export function cierreHistorialMontoReal(item) {
  const n = pickFirstFiniteNumber(item, ["montoReal", "MontoReal", "montoContado", "MontoContado"]);
  return n;
}

/**
 * Diferencia guardada en servidor o calculada (real − esperado) cuando ambos existen.
 * Devuelve null si no aplica (ej. caja abierta sin conteo).
 */
export function cierreHistorialDiferencia(item) {
  const explicit = pickFirstFiniteNumber(item, ["diferencia", "Diferencia"]);
  if (explicit != null) return explicit;
  const esp = cierreHistorialMontoEsperado(item);
  const real = cierreHistorialMontoReal(item);
  if (real == null) return null;
  return real - esp;
}

export function cierreFechaRaw(item) {
  if (!item || typeof item !== "object") return "";
  return (
    item.fechaHoraCierre ??
    item.FechaHoraCierre ??
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

/** Contado físico; null si aún no hubo arqueo (ej. turno abierto). */
export function cierreDetalleMontoRealNullable(d) {
  return pickFirstFiniteNumber(d || {}, ["montoReal", "MontoReal", "montoContado", "MontoContado"]);
}

export function cierreDetalleDiferencia(d) {
  const explicit = pickFirstFiniteNumber(d || {}, ["diferencia", "Diferencia"]);
  if (explicit != null) return explicit;
  const real = pickFirstFiniteNumber(d || {}, ["montoReal", "MontoReal", "montoContado", "MontoContado"]);
  if (real == null) return null;
  const esp = cierreDetalleMontoEsperado(d);
  return real - esp;
}

export function cierreDetalleMontoInicial(d) {
  return pickFirstFiniteNumber(d || {}, ["montoInicial", "MontoInicial"]) ?? 0;
}

export function cierreDetalleTotalGeneral(d) {
  return pickFirstFiniteNumber(d || {}, ["totalGeneral", "TotalGeneral"]) ?? 0;
}

export function cierreDetalleTexto(d, keys) {
  if (!d || typeof d !== "object") return "";
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
    const v = d[k];
    if (v == null || v === "") continue;
    return String(v);
  }
  return "";
}

/** Fecha/hora corta para encabezados de detalle de cierre. */
export function cierreDetalleFechaDisplay(d) {
  if (!d || typeof d !== "object") return "—";
  const raw = d.fechaHoraCierre ?? d.FechaHoraCierre ?? d.fechaCierre ?? d.FechaCierre ?? "";
  const s = String(raw).trim();
  return s ? s.slice(0, 16).replace("T", " ") : "—";
}

/** Clase Tailwind para el color del número de diferencia (faltante / sobrante). */
export function diffAmountTextClass(diffVal) {
  if (diffVal == null || !Number.isFinite(Number(diffVal))) return "text-slate-600";
  const n = Number(diffVal);
  if (n < 0) return "text-red-700";
  if (n > 0) return "text-emerald-700";
  return "text-slate-800";
}

/** Totales por medio de pago en el detalle de cierre (API). */
export function cierreDetalleMediosPago(d) {
  if (!d || typeof d !== "object") {
    return { efectivo: null, tarjeta: null, transferencia: null };
  }
  return {
    efectivo: pickFirstFiniteNumber(d, ["totalEfectivo", "TotalEfectivo"]),
    tarjeta: pickFirstFiniteNumber(d, ["totalTarjeta", "TotalTarjeta"]),
    transferencia: pickFirstFiniteNumber(d, ["totalTransferencia", "TotalTransferencia"]),
  };
}

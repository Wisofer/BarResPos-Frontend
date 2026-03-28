/** Lee el primer número finito entre claves camelCase / PascalCase. */
export function pickPedidoNumero(obj, keys) {
  if (obj == null || typeof obj !== "object") return null;
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Subtotal consumo (líneas / monto pedido), alineado con API. */
export function pedidoSubtotalConsumoCordobas(p) {
  return (
    pickPedidoNumero(p, [
      "subtotalPedidoCordobas",
      "SubtotalPedidoCordobas",
      "monto",
      "Monto",
      "total",
      "Total",
    ]) ?? 0
  );
}

/** Descuento aplicado en cobro (C$). */
export function pedidoDescuentoCobroCordobas(p) {
  const v = pickPedidoNumero(p, ["descuentoCordobas", "DescuentoCordobas"]);
  return v != null ? v : 0;
}

/** Total neto cobrado; null si aún no aplica (ej. no pagado). */
export function pedidoTotalNetoCobradoCordobas(p) {
  return pickPedidoNumero(p, ["totalNetoCobradoCordobas", "TotalNetoCobradoCordobas"]);
}

export function pedidoPagosLista(p) {
  const raw = p?.pagos ?? p?.Pagos;
  return Array.isArray(raw) ? raw : [];
}

export function pagoMontoNetoCobradoCordobas(p) {
  return pickPedidoNumero(p, ["montoNetoCobradoCordobas", "MontoNetoCobradoCordobas"]);
}

export function pagoDescuentoAtribuidoCordobas(p) {
  return pickPedidoNumero(p, ["descuentoAtribuidoCordobas", "DescuentoAtribuidoCordobas"]) ?? 0;
}

export function pagoDescuentoMotivo(p) {
  return p?.descuentoMotivo ?? p?.DescuentoMotivo ?? "";
}

export function pagoFecha(p) {
  return p?.fechaPago ?? p?.FechaPago ?? null;
}

export function pagoTipo(p) {
  return p?.tipoPago ?? p?.TipoPago ?? "-";
}

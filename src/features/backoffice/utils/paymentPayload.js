/**
 * Construye payload de cobro para backend:
 * - `montoPagado` en la moneda seleccionada por el usuario.
 * - `moneda` según contrato backend (`C$` o `$`).
 * - desglose físico/electrónico para auditoría de caja.
 */
export function buildPagoPayload({ ordenId, form, defaultObservaciones = "Pago" }) {
  const monedaPago = form.moneda === "USD" ? "$" : "C$";
  const montoPagado = Number(form.montoRecibido || form.totalAPagarMoneda || 0);
  const esEfectivo = form.tipoPago === "Efectivo";

  const montoCordobasFisico = esEfectivo && monedaPago === "C$" ? montoPagado : null;
  const montoDolaresFisico = esEfectivo && monedaPago === "$" ? montoPagado : null;
  const montoCordobasElectronico = !esEfectivo && monedaPago === "C$" ? montoPagado : null;
  const montoDolaresElectronico = !esEfectivo && monedaPago === "$" ? montoPagado : null;

  const obsParts = [
    form.comentario,
    form.descuento > 0 ? `Descuento: ${form.descuento}` : null,
    form.moneda === "USD" ? `TC: ${form.tipoCambioAplicado}` : null,
    esEfectivo
      ? `Recibido: ${form.montoRecibido} ${form.moneda}, Vuelto: ${form.vueltoMoneda} ${form.moneda} (${form.vueltoCordobas} C$)`
      : null,
  ].filter(Boolean);

  const descuentoMonto = Number(form.descuento) > 0 ? Number(form.descuento) : undefined;
  const descuentoMotivo =
    descuentoMonto != null && String(form.comentario || "").trim() ? String(form.comentario).trim() : undefined;

  return {
    ordenId: Number(ordenId),
    tipoPago: form.tipoPago,
    montoPagado,
    moneda: monedaPago,
    banco: null,
    tipoCuenta: null,
    observaciones: obsParts.join(" | ") || defaultObservaciones,
    montoCordobasFisico,
    montoDolaresFisico,
    montoCordobasElectronico,
    montoDolaresElectronico,
    ...(descuentoMonto != null ? { descuentoMonto, ...(descuentoMotivo ? { descuentoMotivo } : {}) } : {}),
  };
}

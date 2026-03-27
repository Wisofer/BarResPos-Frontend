/**
 * Variantes de Badge por estado (pago, venta, factura, historial).
 * Uso: <Badge variant={STATUS_VARIANT[status] || "default"}>
 */
export const STATUS_VARIANT = {
  Pagado: "success",
  Pagada: "success",
  Completado: "success",
  pendiente: "warning",
  Pendiente: "warning",
  Parcial: "info",
  cotizacion: "info",
  Cotización: "info",
  Vencida: "danger",
  Cancelada: "danger",
};

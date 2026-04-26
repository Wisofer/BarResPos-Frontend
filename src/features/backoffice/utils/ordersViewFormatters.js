/** Presentación: estados, fechas y etiquetas de la vista de pedidos. */

export function orderStatusPillClass(status) {
  if (status === "Listo") return "bg-emerald-50 text-emerald-700";
  if (status === "Entregado") return "bg-blue-50 text-blue-700";
  if (status === "Despacho") return "bg-violet-50 text-violet-700";
  if (status === "Pagado") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelado") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

/** Partes de fecha/hora para celdas; nunca devuelve un string suelto (evita `dt.date` undefined). */
export function formatDateTimeParts(value) {
  if (!value) return { date: "—", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("es-NI"),
    time: d.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export function formatDateTimeLabel(value) {
  const p = formatDateTimeParts(value);
  if (p.date === "—" && !p.time) return "—";
  return p.time ? `${p.date} ${p.time}` : p.date;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function labelTipoPedido(tipo, origenPedido) {
  const t = String(tipo || "").toLowerCase();
  if (t === "delivery") return "Delivery";
  /** "Llevar" se gestiona como misma lógica que salón (productos en la mesa). */
  if (t === "llevar" || t === "mesa") return "Mesa";
  const o = String(origenPedido || "");
  if (o === "Delivery") return "Delivery";
  if (o === "Llevar" || o === "Salon" || o === "") return "Mesa";
  return tipo || origenPedido || "—";
}

export function labelDestinoPedido(order) {
  const tipo = String(order?.tipo || "").toLowerCase();
  const origen = String(order?.origenPedido || "").toLowerCase();
  const isDelivery = tipo === "delivery" || origen === "delivery";

  if (isDelivery) {
    return order?.clienteNombre?.trim() || order?.table || "Delivery";
  }
  return order?.table?.trim() || "Mesa";
}

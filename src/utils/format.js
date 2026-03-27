// Nicaragua: Córdobas (NIO), locale es-NI
export function formatCurrency(amount, currency = "NIO") {
  return new Intl.NumberFormat("es-NI", { style: "currency", currency }).format(amount);
}

/**
 * Formatea un monto según la forma de pago: Dólares/TransferenciaDolares → USD ($), resto → NIO (C$).
 * paymentMethod: "Dolares" | "TransferenciaDolares" → USD; "Cordobas" | "Transferencia" | "TransferenciaCordobas" | null → NIO
 */
export function formatAmountByPaymentMethod(amount, paymentMethod) {
  const isDollars =
    paymentMethod === "Dolares" ||
    paymentMethod === "Dólares" ||
    paymentMethod === "TransferenciaDolares";
  return formatCurrency(amount, isDollars ? "USD" : "NIO");
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr.replace(" ", "T")));
}

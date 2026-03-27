export function getStatusRaw(sale) {
  return String(sale?.status ?? "").trim();
}

export function getStatusCanonical(sale) {
  const normalized = getStatusRaw(sale)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!normalized) return "pagada";
  if (["pagada", "pagado", "completada", "completado"].includes(normalized)) return "pagada";
  if (["pendiente", "parcial"].includes(normalized)) return "pendiente";
  if (["cotizacion", "quote"].includes(normalized)) return "cotizacion";
  if (["cancelada", "cancelado", "anulada", "anulado"].includes(normalized)) return "cancelada";
  return normalized;
}

export function getSaleCurrency(sale) {
  const directCurrency = String(
    sale?.currency ?? sale?.moneda ?? sale?.saleCurrency ?? sale?.invoiceCurrency ?? ""
  )
    .trim()
    .toUpperCase();
  if (directCurrency === "USD" || directCurrency === "DOLARES" || directCurrency === "DÓLARES") return "USD";
  if (directCurrency === "NIO" || directCurrency === "CORDOBAS" || directCurrency === "CÓRDOBAS") return "NIO";

  const method = String(
    sale?.paymentMethod ??
      sale?.paymentType ??
      sale?.payment_method ??
      sale?.payment_type ??
      sale?.method ??
      ""
  )
    .trim()
    .toLowerCase();
  if (["dolares", "dólares", "transferenciadolares", "transferenciausd", "usd"].includes(method)) return "USD";

  const payments = Array.isArray(sale?.paymentHistory)
    ? sale.paymentHistory
    : Array.isArray(sale?.payments)
      ? sale.payments
      : [];
  const hasUsdPayment = payments.some((p) => {
    const t = String(
      p?.currency ?? p?.moneda ?? p?.paymentType ?? p?.payment_method ?? p?.method ?? p?.type ?? ""
    )
      .trim()
      .toLowerCase();
    return ["usd", "dolares", "dólares", "transferenciadolares", "transferenciausd"].includes(t);
  });
  if (hasUsdPayment) return "USD";

  return "NIO";
}

export function getEffectiveExchangeRate(sale, fallbackRate = 36.8) {
  const n = Number(sale?.exchangeRate ?? fallbackRate);
  return Number.isFinite(n) && n > 0 ? n : 36.8;
}

export function convertAmountBetweenCurrencies(amount, fromCurrency, toCurrency, sale, fallbackRate = 36.8) {
  if (fromCurrency === toCurrency) return amount;
  const rate = getEffectiveExchangeRate(sale, fallbackRate);
  if (fromCurrency === "USD" && toCurrency === "NIO") return amount * rate;
  if (fromCurrency === "NIO" && toCurrency === "USD") return amount / rate;
  return amount;
}

export function getPaymentTypeLabel(payment) {
  const raw = String(
    payment?.type ?? payment?.paymentType ?? payment?.payment_method ?? payment?.paymentMethod ?? payment?.method ?? ""
  )
    .trim()
    .toLowerCase();
  if (!raw) return "—";
  if (["fisico", "físico", "efectivo", "cash"].includes(raw)) return "💵 Físico";
  if (["tarjeta", "card"].includes(raw)) return "💳 Tarjeta";
  if (["transferencia", "transfer", "bank_transfer"].includes(raw)) return "🏦 Transferencia";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getPaymentsHistory(sale) {
  const list = sale?.paymentHistory || sale?.payments || [];
  return Array.isArray(list) ? list : [];
}

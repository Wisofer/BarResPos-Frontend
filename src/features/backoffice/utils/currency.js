/** Si /configuraciones/tipo-cambio no devuelve valor válido (solo respaldo). */
export const DEFAULT_TIPO_CAMBIO_USD = 36.8;

export function formatCurrency(value, symbol = "C$") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${symbol} 0.00`;
  return `${symbol} ${amount.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function resolveCurrencySymbol(configs = []) {
  const map = new Map(
    (Array.isArray(configs) ? configs : []).map((c) => [String(c?.clave || "").toLowerCase(), c?.valor])
  );
  const raw =
    map.get("moneda") ||
    map.get("monedaprincipal") ||
    map.get("simbolomoneda") ||
    map.get("currencysymbol");
  if (!raw) return "C$";
  if (String(raw).includes("C$")) return "C$";
  if (String(raw).includes("$")) return "$";
  return String(raw).trim();
}

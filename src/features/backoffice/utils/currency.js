/** Si /configuraciones/tipo-cambio no devuelve valor válido (solo respaldo). */
export const DEFAULT_TIPO_CAMBIO_USD = 36.8;

/**
 * Interpreta la respuesta de GET /api/v1/configuraciones/tipo-cambio (incl. envoltura `data`).
 * @returns {number|null} Valor positivo o null si no hay dato usable.
 */
export function parseTipoCambioApiResponse(tc) {
  let d = tc;
  if (d && typeof d === "object" && d.data != null && typeof d.data === "object" && !Array.isArray(d.data)) {
    d = d.data;
  }
  if (d == null || typeof d !== "object" || Array.isArray(d)) return null;
  const raw = d.tipoCambioDolar ?? d.TipoCambioDolar ?? d.valor ?? d.Valor;
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Texto inicial del input en Ajustes tras GET `tipo-cambio` (2 decimales; respaldo si no hay dato). */
export function tipoCambioInputTextFromApi(tc) {
  const n = parseTipoCambioApiResponse(tc);
  return (n != null ? n : DEFAULT_TIPO_CAMBIO_USD).toFixed(2);
}

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

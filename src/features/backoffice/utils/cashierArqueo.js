import { formatCurrency } from "./currency.js";

/**
 * Compara efectivo contado vs monto esperado (preview). Solo UI; el cierre definitivo lo calcula el API.
 * @returns {{ kind: 'empty'|'cuadra'|'sobra'|'falta', diff: number, label: string, detail: string } | null}
 */
export function computeArqueoPreview(montoContadoInput, montoEsperado) {
  const raw = String(montoContadoInput ?? "").trim();
  if (raw === "") {
    return { kind: "empty", diff: 0, label: "", detail: "" };
  }
  const contado = Number(raw.replace(",", "."));
  const esperado = Number(montoEsperado ?? 0);
  if (!Number.isFinite(contado) || !Number.isFinite(esperado)) {
    return null;
  }
  const diff = Math.round((contado - esperado) * 100) / 100;
  if (Math.abs(diff) < 0.005) {
    return {
      kind: "cuadra",
      diff: 0,
      label: "Cuadra",
      detail: "El conteo coincide con el monto esperado en caja.",
    };
  }
  if (diff > 0) {
    return {
      kind: "sobra",
      diff,
      label: "Sobra efectivo",
      detail: "Hay más efectivo del que el sistema esperaba (revisar ventas o conteo).",
    };
  }
  return {
    kind: "falta",
    diff,
    label: "Falta efectivo",
    detail: "Hay menos efectivo del que el sistema esperaba (revisar ventas o conteo).",
  };
}

export function formatDiffForMessage(diff, currencySymbol) {
  const d = Number(diff);
  if (!Number.isFinite(d)) return "";
  const abs = formatCurrency(Math.abs(d), currencySymbol);
  if (Math.abs(d) < 0.005) return "sin diferencia";
  return d > 0 ? `sobra ${abs}` : `falta ${abs}`;
}

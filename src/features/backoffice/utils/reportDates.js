/**
 * Suma un día a una fecha YYYY-MM-DD (calendario local del input type=date).
 * Sirve para APIs que filtran [desde, hasta) con "hasta" = inicio del día exclusivo:
 * el usuario elige "hasta el 29" y hay que enviar hasta=30 para incluir todo el día 29.
 */
export function addOneCalendarDay(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return dateStr;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateStr;
  const local = new Date(y, m, d);
  local.setDate(local.getDate() + 1);
  const yy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Rango { desde, hasta } para BarRestPOS: el backend toma `hasta` como **último día inclusivo**
 * (p. ej. ReporteService/Dashboard: finRango = hasta.Date + 1 d − 1 tick; caja: FechaCierre <= hasta.Date).
 * No se suma un día extra en el front.
 */
export function reportApiDateRange(range) {
  const desde = range?.desde?.trim() || undefined;
  const userHasta = range?.hasta?.trim();
  return { desde, hasta: userHasta || undefined };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildDateRange(range) {
  return reportApiDateRange(range);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-NI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
 * Construye { desde, hasta } para reportes: "hasta" del usuario es inclusivo;
 * el valor enviado al API es el día siguiente (fin exclusivo), si el backend usa ese patrón.
 */
export function reportApiDateRange(range) {
  const desde = range?.desde?.trim() || undefined;
  const userHasta = range?.hasta?.trim();
  const hasta = userHasta ? addOneCalendarDay(userHasta) : undefined;
  return { desde, hasta };
}

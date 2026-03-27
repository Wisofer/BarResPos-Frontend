/**
 * Obtiene el rango de fechas a partir de fechas escritas por el usuario.
 * @param {string} dateFromStr - Fecha inicio YYYY-MM-DD o vacío
 * @param {string} dateToStr - Fecha fin YYYY-MM-DD o vacío
 * @returns {{ start: Date, end: Date } | null} - null si ambas vacías
 */
export function getDateRangeFromInputs(dateFromStr, dateToStr) {
  const from = dateFromStr?.trim();
  const to = dateToStr?.trim();
  if (!from && !to) return null;
  let start = from ? new Date(from) : new Date(0);
  start.setHours(0, 0, 0, 0);
  let end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  if (!from) start.setTime(0);
  if (start > end) [start, end] = [end, start]; // intercambiar si el usuario puso al revés
  return { start, end };
}

/**
 * Indica si una fecha (string YYYY-MM-DD) está dentro del rango.
 */
export function isDateInRange(dateStr, range) {
  if (!range || !dateStr) return true;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

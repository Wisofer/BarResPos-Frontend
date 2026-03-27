/**
 * Caché genérico para listas (reservaciones, ventas, facturas).
 * Evita pantalla de carga al volver a la vista si los datos siguen válidos.
 */

const TTL_MS = 2 * 60 * 1000; // 2 minutos

function cacheKey(prefix, filters) {
  const f = filters && typeof filters === "object" ? filters : {};
  const parts = Object.keys(f)
    .sort()
    .map((k) => `${k}=${f[k] ?? ""}`);
  return `${prefix}:${parts.join(";")}`;
}

export function getCachedList(prefix, filters) {
  try {
    const raw = sessionStorage.getItem(cacheKey(prefix, filters));
    if (!raw) return null;
    const { list, at } = JSON.parse(raw);
    if (Date.now() - at > TTL_MS) return null;
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

export function setCachedList(prefix, filters, list) {
  try {
    sessionStorage.setItem(
      cacheKey(prefix, filters),
      JSON.stringify({
        list: Array.isArray(list) ? list : [],
        at: Date.now(),
      })
    );
  } catch {}
}

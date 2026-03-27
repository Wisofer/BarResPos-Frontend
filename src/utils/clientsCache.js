/**
 * Caché en memoria para la lista de clientes (solo primera página).
 * Evita pantalla de carga al volver a la vista si los datos siguen válidos.
 */

import { CLIENTS_CACHE_KEY as CACHE_KEY } from "../config/brand.js";
const TTL_MS = 2 * 60 * 1000; // 2 minutos

function getKey(search = "") {
  return `${CACHE_KEY}:${search ?? ""}`;
}

/** @returns {{ list: any[], totalCount: number, totalPages: number } | null} */
export function getCachedClients(search) {
  try {
    const raw = sessionStorage.getItem(getKey(search));
    if (!raw) return null;
    const { list, totalCount, totalPages, at } = JSON.parse(raw);
    if (Date.now() - at > TTL_MS) return null;
    return {
      list: Array.isArray(list) ? list : [],
      totalCount: typeof totalCount === "number" ? totalCount : 0,
      totalPages: typeof totalPages === "number" ? totalPages : 0,
    };
  } catch {
    return null;
  }
}

/** @param {string} search
 *  @param {{ list: any[], totalCount: number, totalPages: number }} data
 */
export function setCachedClients(search, data) {
  try {
    const list = Array.isArray(data?.list) ? data.list : [];
    sessionStorage.setItem(
      getKey(search),
      JSON.stringify({
        list,
        totalCount: typeof data?.totalCount === "number" ? data.totalCount : 0,
        totalPages: typeof data?.totalPages === "number" ? data.totalPages : 0,
        at: Date.now(),
      })
    );
  } catch {}
}

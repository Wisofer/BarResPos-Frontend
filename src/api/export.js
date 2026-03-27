import { getApiUrl } from "./config.js";
import { getToken } from "./token.js";

function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) return "";
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

/**
 * Descarga un archivo desde un endpoint de exportación (Excel o PDF).
 * En modo demo estático no hay backend: se muestra mensaje al usuario.
 * @param {string} basePath - Ej: "/api/clients", "/api/reservations", "/api/sales", "/api/invoices"
 * @param {"excel"|"pdf"} format - "excel" o "pdf"
 * @param {Record<string, string|number|undefined>} params - Query params (search, clientId, status, dateFrom, dateTo, paymentStatus, etc.)
 * @param {string} defaultFilename - Nombre por defecto si no viene Content-Disposition (ej. "Clientes.xlsx")
 * @returns {Promise<void>}
 */
export async function downloadExport(basePath, format, params, defaultFilename) {
  const token = getToken();
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const path = `${base}/export/${format}${buildQueryString(params)}`;
  const url = `${getApiUrl()}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) throw new Error("No autorizado");
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || text;
    } catch (_) {}
    throw new Error(msg || `Error ${res.status}`);
  }

  const blob = await res.blob();
  let filename = defaultFilename;
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename[*]?=(?:UTF-8'')?"?([^";\n]+)"?/i);
    if (match && match[1]) filename = match[1].trim();
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

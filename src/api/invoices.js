import { api } from "./client.js";
import { getApiUrl } from "./config.js";
import { getToken } from "./token.js";

const base = "/api/invoices";

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== "") s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : "";
}

/** GET /api/invoices/{id}/pdf — PDF con Bearer, devuelve Blob para imprimir/descargar. */
async function getPdfBlob(id) {
  const token = getToken();
  const url = `${getApiUrl()}${base.startsWith("/") ? base : `/${base}`}/${id}/pdf`;
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("No autorizado");
  if (res.status === 404) throw new Error("Factura no encontrada");
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || text;
    } catch (_) {}
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.blob();
}

export const invoicesApi = {
  list: (params) => api.get(`${base}${qs(params)}`),
  get: (id) => api.get(`${base}/${id}`),
  getPdfUrl: (id) => api.get(`${base}/${id}/pdf-url`),
  getPdf: (id) => getPdfBlob(id),
  nextCode: () => api.get(`${base}/next-code`),
  create: (body) => api.post(base, body),
  update: (id, body) => api.put(`${base}/${id}`, { ...body, id }),
  delete: (id) => api.delete(`${base}/${id}`),
};

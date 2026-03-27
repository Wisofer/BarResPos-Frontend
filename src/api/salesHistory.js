import { api } from "./client.js";

const base = "/api/sales-history";

/** Backend espera id numérico en la URL (ej. 36); la respuesta puede traer id "V36". */
function toNumericId(id) {
  if (id == null) return id;
  const s = String(id);
  const m = s.match(/^V(\d+)$/i);
  return m ? m[1] : s;
}

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const salesHistoryApi = {
  list: (params) => api.get(`${base}${qs(params || {})}`),
  get: (id) => api.get(`${base}/${toNumericId(id)}`),
  update: (id, body) => api.put(`${base}/${toNumericId(id)}`, body),
  cancel: (id) => api.put(`${base}/${toNumericId(id)}`, { status: "Cancelada" }),
  addPayment: (id, amount, options = {}) =>
    api.put(`${base}/${toNumericId(id)}`, {
      addPayment: amount,
      ...(options?.paymentType ? { paymentType: options.paymentType } : {}),
      ...(options?.bank ? { bank: options.bank } : {}),
    }),
  createOrReuseInvoice: (id) => api.post(`${base}/${toNumericId(id)}/invoice`, {}),
  ticketPdfUrl: (id) => api.get(`${base}/${toNumericId(id)}/ticket-pdf-url`),
};

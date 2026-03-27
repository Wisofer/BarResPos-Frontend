import { api } from "./client.js";

const base = "/api/caja";

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== "") s.set(k, v); });
  return s.toString() ? `?${s.toString()}` : "";
}

export const cajaApi = {
  list: (params) => api.get(`${base}${qs(params)}`),
  get: (date) => api.get(`${base}/${date}`),
  createOrUpdate: (body) => api.post(base, body),
  update: (date, body) => api.put(`${base}/${date}`, { ...body, date }),
};

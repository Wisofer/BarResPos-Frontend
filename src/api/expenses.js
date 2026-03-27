import { api } from "./client.js";

const base = "/api/expenses";

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== "") s.set(k, v); });
  return s.toString() ? `?${s.toString()}` : "";
}

export const expensesApi = {
  list: (params) => api.get(`${base}${qs(params)}`),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, body),
  update: (id, body) => api.put(`${base}/${id}`, { ...body, id }),
  delete: (id) => api.delete(`${base}/${id}`),
};

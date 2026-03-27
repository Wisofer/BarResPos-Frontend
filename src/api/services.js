import { api } from "./client.js";

const base = "/api/services";

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const servicesApi = {
  list: (params) => api.get(`${base}${qs(params || {})}`),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, body),
  update: (id, body) => api.put(`${base}/${id}`, { ...body, id }),
  delete: (id) => api.delete(`${base}/${id}`),
};

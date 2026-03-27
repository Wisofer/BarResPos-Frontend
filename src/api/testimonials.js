import { api } from "./client.js";

const base = "/api/testimonials";

export const testimonialsApi = {
  list: () => api.get(base),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, body),
  update: (id, body) => api.put(`${base}/${id}`, body),
  approve: (id, approved) => api.put(`${base}/${id}/approve`, approved),
  delete: (id) => api.delete(`${base}/${id}`),
};

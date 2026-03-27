import { api } from "./client.js";

const base = "/api/WebsiteServices";

export const websiteServicesApi = {
  list: () => api.get(base),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, body),
  update: (id, body) => api.put(`${base}/${id}`, body),
  delete: (id) => api.delete(`${base}/${id}`),
};

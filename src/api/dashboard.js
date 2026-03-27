import { api } from "./client.js";

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== "") s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const dashboardApi = {
  summary: () => api.get("/api/dashboard/summary"),
  recentActivity: (params) => api.get(`/api/dashboard/recent-activity${qs(params || {})}`),
  monthlyIncome: (params) => api.get(`/api/dashboard/monthly-income${qs(params || {})}`),
  topProducts: () => api.get("/api/dashboard/top-products"),
  alerts: () => api.get("/api/dashboard/alerts"),
};

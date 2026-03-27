import { api } from "./client.js";

export const activityApi = {
  list: (params = {}) => {
    const s = new URLSearchParams();
    if (params.limit != null) s.set("limit", params.limit);
    if (params.from) s.set("from", params.from);
    const q = s.toString();
    return api.get(`/api/activity${q ? `?${q}` : ""}`);
  },
};

import { api } from "./client.js";

export const settingsApi = {
  get: () => api.get("/api/settings"),
  update: (body) => api.put("/api/settings", body),
};

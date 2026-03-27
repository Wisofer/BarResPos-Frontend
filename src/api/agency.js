import { api } from "./client.js";

export const agencyApi = {
  get: () => api.get("/api/agency"),
  update: (body) => api.put("/api/agency", body),
};

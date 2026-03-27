import { api } from "./client.js";

export const exchangeRateApi = {
  get: () => api.get("/api/exchange-rate"),
  update: (body) => api.put("/api/exchange-rate", body),
};

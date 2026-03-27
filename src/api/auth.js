import { api } from "./client.js";

export const authApi = {
  login: (nombreUsuario, contrasena) =>
    api.post("/api/v1/auth/login", { nombreUsuario, contrasena }),

  refresh: (refreshToken) => api.post("/api/v1/auth/refresh", { refreshToken }),

  revoke: (refreshToken) => api.post("/api/v1/auth/revoke", { refreshToken }),

  logout: () => api.post("/api/v1/auth/logout"),

  me: () => api.get("/api/v1/auth/me"),
};

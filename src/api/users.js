import { api } from "./client.js";

const base = "/api/users";

/** El backend espera nombreUsuario en el body; el front usa "usuario". */
function toBackendUser(body) {
  const { usuario, ...rest } = body;
  return usuario !== undefined ? { ...rest, nombreUsuario: usuario } : rest;
}

export const usersApi = {
  list: () => api.get(base),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, toBackendUser(body)),
  update: (id, body) => api.put(`${base}/${id}`, { ...toBackendUser(body), id }),
  delete: (id) => api.delete(`${base}/${id}`),
};

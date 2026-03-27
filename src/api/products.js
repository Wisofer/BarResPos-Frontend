import { api } from "./client.js";

const base = "/api/products";

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

/** Convierte body del formulario (snake_case) a camelCase para el backend real. */
function toProductBodyCamel(body, includeId = false) {
  if (!body || typeof body !== "object") return body;
  const o = {
    nombreProducto: body.nombre_producto ?? body.nombreProducto,
    tipoProducto: body.tipo_producto ?? body.tipoProducto,
    marca: body.marca,
    precioCompra: Number(body.precio_compra ?? body.precioCompra) || 0,
    precio: Number(body.precio) || 0,
    stock: Number(body.stock) || 0,
    stockMinimo: Number(body.stockMinimo ?? body.stock_minimo) || 0,
    descripcion: body.descripcion ?? "",
    proveedor: body.proveedor ?? "",
    fechaCreacion: body.fecha_creacion ?? body.fechaCreacion,
  };
  if (includeId && (body.id != null)) o.id = body.id;
  return o;
}

export const productsApi = {
  list: (params) => api.get(`${base}${qs(params || {})}`),
  get: (id) => api.get(`${base}/${id}`),
  create: (body) => api.post(base, toProductBodyCamel(body)),
  update: (id, body) => api.put(`${base}/${id}`, { ...toProductBodyCamel(body, true), id }),
  delete: (id) => api.delete(`${base}/${id}`),
  /** Suma cantidad al stock actual (entero > 0). */
  restock: (id, cantidad) => {
    const n = Math.floor(Number(cantidad));
    if (!Number.isFinite(n) || n < 1) {
      return Promise.reject(new Error("La cantidad debe ser un entero mayor que 0."));
    }
    return api.post(`${base}/${id}/restock`, { cantidad: n });
  },
  /** Productos con stock en o por debajo del mínimo (banner / alertas). */
  lowStock: () => api.get(`${base}/low-stock`),
};

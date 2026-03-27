import { api } from "./client.js";

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== "") s.set(k, v); });
  const str = s.toString();
  return str ? `?${str}` : "";
};

const report = (path, params) => api.get(`/api/reports/${path}${qs(params)}`);

export const reportsApi = {
  sales: (params) => report("sales", params),
  ventasDia: (params) => report("ventas-dia", params),
  ventasMes: (params) => report("ventas-mes", params),
  productosMasVendidos: () => report("productos-mas-vendidos"),
  ingresosTotales: (params) => report("ingresos-totales", params),
};

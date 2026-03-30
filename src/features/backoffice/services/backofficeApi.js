import { api } from "../../../api/client.js";
import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const backofficeApi = {
  dashboardResumen: (params) => api.get(`/api/v1/dashboard/resumen${qs(params)}`),
  listMesas: (params) => api.get(`/api/v1/mesas${qs(params)}`),
  getMesa: (id) => api.get(`/api/v1/mesas/${id}`),
  getMesaOrdenActiva: (id) => api.get(`/api/v1/mesas/${id}/orden-activa`),
  createMesa: (body) => api.post("/api/v1/mesas", body),
  updateMesa: (id, body) => api.put(`/api/v1/mesas/${id}`, body),
  patchMesaEstado: (id, estado) => api.patch(`/api/v1/mesas/${id}/estado`, { estado }),
  deleteMesa: (id) => api.delete(`/api/v1/mesas/${id}`),
  catalogoUbicaciones: () => api.get("/api/v1/catalogos/ubicaciones"),
  getUbicacion: (id) => api.get(`/api/v1/catalogos/ubicaciones/${id}`),
  createUbicacion: (body) => api.post("/api/v1/catalogos/ubicaciones", body),
  updateUbicacion: (id, body) => api.put(`/api/v1/catalogos/ubicaciones/${id}`, body),
  deleteUbicacion: (id) => api.delete(`/api/v1/catalogos/ubicaciones/${id}`),
  listPedidos: (params) => api.get(`/api/v1/pedidos${qs(params)}`),
  pedidosResumen: (params) => api.get(`/api/v1/pedidos/resumen${qs(params)}`),
  getPedido: (id) => api.get(`/api/v1/pedidos/${id}`),
  pedidoPrecuenta: (id) => api.get(`/api/v1/pedidos/${id}/precuenta`),
  pedidoPrecuentaHtml: (id) => api.get(`/api/v1/pedidos/${id}/precuenta/html`),
  patchPedidoEstado: (id, estado) => api.patch(`/api/v1/pedidos/${id}/estado`, { estado }),
  /** Asigna el pedido a otra mesa (trasladar pedido, no la mesa). Opcional; si no existe, el front usa PUT pedido. */
  pedidoTrasladarMesa: (pedidoId, mesaIdDestino) =>
    api.patchWithEnvelope(`/api/v1/pedidos/${pedidoId}/mesa`, { mesaId: mesaIdDestino }),
  updatePedido: (id, body) => api.put(`/api/v1/pedidos/${id}`, body),
  listProductos: (params) => api.get(`/api/v1/productos${qs(params)}`),
  getProducto: (id) => api.get(`/api/v1/productos/${id}`),
  createProducto: (body) => api.post("/api/v1/productos", body),
  updateProducto: (id, body) => api.put(`/api/v1/productos/${id}`, body),
  deleteProducto: (id) => api.delete(`/api/v1/productos/${id}`),
  listProductoOpcionesGrupos: (productoId) => api.get(`/api/v1/productos/${productoId}/opciones/grupos`),
  createProductoOpcionGrupo: (productoId, body) => api.post(`/api/v1/productos/${productoId}/opciones/grupos`, body),
  updateProductoOpcionGrupo: (productoId, grupoId, body) =>
    api.put(`/api/v1/productos/${productoId}/opciones/grupos/${grupoId}`, body),
  deleteProductoOpcionGrupo: (productoId, grupoId) =>
    api.delete(`/api/v1/productos/${productoId}/opciones/grupos/${grupoId}`),
  createProductoOpcionItem: (productoId, grupoId, body) =>
    api.post(`/api/v1/productos/${productoId}/opciones/grupos/${grupoId}/items`, body),
  updateProductoOpcionItem: (productoId, grupoId, opcionId, body) =>
    api.put(`/api/v1/productos/${productoId}/opciones/grupos/${grupoId}/items/${opcionId}`, body),
  deleteProductoOpcionItem: (productoId, grupoId, opcionId) =>
    api.delete(`/api/v1/productos/${productoId}/opciones/grupos/${grupoId}/items/${opcionId}`),
  entradaStockProducto: (body) => api.post("/api/v1/productos/entrada-stock", body),
  salidaStockProducto: (body) => api.post("/api/v1/productos/salida-stock", body),
  ajusteStockProducto: (body) => api.post("/api/v1/productos/ajuste-stock", body),
  movimientosProducto: (id, params) => api.get(`/api/v1/productos/${id}/movimientos${qs(params)}`),
  movimientosProductos: (params) => api.get(`/api/v1/productos/movimientos${qs(params)}`),
  catalogoCategoriasProducto: () => api.get("/api/v1/catalogos/categorias-producto"),
  getCategoriaProducto: (id) => api.get(`/api/v1/catalogos/categorias-producto/${id}`),
  createCategoriaProducto: (body) => api.post("/api/v1/catalogos/categorias-producto", body),
  updateCategoriaProducto: (id, body) => api.put(`/api/v1/catalogos/categorias-producto/${id}`, body),
  deleteCategoriaProducto: (id) => api.delete(`/api/v1/catalogos/categorias-producto/${id}`),
  catalogoProveedores: () => api.get("/api/v1/catalogos/proveedores"),
  getProveedor: (id) => api.get(`/api/v1/catalogos/proveedores/${id}`),
  createProveedor: (body) => api.post("/api/v1/catalogos/proveedores", body),
  updateProveedor: (id, body) => api.put(`/api/v1/catalogos/proveedores/${id}`, body),
  deleteProveedor: (id) => api.delete(`/api/v1/catalogos/proveedores/${id}`),
  listUsuarios: (params) => api.get(`/api/v1/usuarios${qs(params)}`),
  createUsuario: (body) => api.post("/api/v1/usuarios", body),
  updateUsuario: (id, body) => api.put(`/api/v1/usuarios/${id}`, body),
  deleteUsuario: (id) => api.delete(`/api/v1/usuarios/${id}`),
  cajaEstado: () => api.get("/api/v1/caja/estado"),
  cajaApertura: (montoInicial) => api.post("/api/v1/caja/apertura", { montoInicial }),
  cajaCierrePreview: () => api.get("/api/v1/caja/cierre/preview"),
  cajaCierre: (body) => api.post("/api/v1/caja/cierre", body),
  cajaHistorial: (params) => api.get(`/api/v1/caja/historial${qs(params)}`),
  cajaDetalleCierre: (id) => api.get(`/api/v1/caja/cierre/${id}`),
  ventasProcesarPago: (body) => api.post("/api/v1/ventas/procesar-pago", body),
  ventasGestionarPago: (body) => api.post("/api/v1/ventas/gestionar-pago", body),
  posOrdenes: (body) => api.post("/api/v1/pos/ordenes", body),
  posCancelarOrden: (id) => api.post(`/api/v1/pos/ordenes/${id}/cancelar`, undefined),
  cocinaOrdenEstado: (id, estado) =>
    api.patch(`/api/v1/cocina/ordenes/${id}/estado`, {
      estado,
      EstadoCocina: estado,
      estadoCocina: estado,
    }),
  cocinaOrdenes: (params) => api.get(`/api/v1/cocina/ordenes${qs(params)}`),
  configuraciones: () => api.get("/api/v1/configuraciones"),
  configuracionTipoCambio: () => api.get("/api/v1/configuraciones/tipo-cambio"),
  updateTipoCambio: (tipoCambioDolar) => api.put("/api/v1/configuraciones/tipo-cambio", { tipoCambioDolar }),
  upsertConfiguracion: (clave, valor, descripcion) => api.put(`/api/v1/configuraciones/${encodeURIComponent(clave)}`, { valor, descripcion }),
  listPlantillasWhatsapp: (params) => api.get(`/api/v1/configuraciones/plantillas-whatsapp${qs(params)}`),
  getPlantillaWhatsapp: (id) => api.get(`/api/v1/configuraciones/plantillas-whatsapp/${id}`),
  createPlantillaWhatsapp: (body) => api.post("/api/v1/configuraciones/plantillas-whatsapp", body),
  updatePlantillaWhatsapp: (id, body) => api.put(`/api/v1/configuraciones/plantillas-whatsapp/${id}`, body),
  deletePlantillaWhatsapp: (id) => api.delete(`/api/v1/configuraciones/plantillas-whatsapp/${id}`),
  marcarDefaultPlantillaWhatsapp: (id) => api.patch(`/api/v1/configuraciones/plantillas-whatsapp/${id}/marcar-default`, {}),
  reportesResumenVentas: (params) => api.get(`/api/v1/reportes/resumen-ventas${qs(params)}`),
  reportesProductosTop: (params) => api.get(`/api/v1/reportes/productos-top${qs(params)}`),

  /** Delivery: misma entidad orden/factura, origenPedido Delivery, sin mesa. */
  listDeliveryPedidos: (params) => api.get(`/api/v1/delivery/pedidos${qs(params)}`),
  getDeliveryPedido: (id) => api.get(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}`),
  createDeliveryPedido: (body) => api.post("/api/v1/delivery/pedidos", body),
  updateDeliveryPedido: (id, body) => api.put(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}`, body),
  deliveryPedidoEnviarCocina: (id) => api.patch(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}/enviar-cocina`, {}),
  deliveryPedidoCancelar: (id) => api.patch(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}/cancelar`, {}),
  deliveryPedidoPrecuenta: (id) => api.get(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}/precuenta`),
  deliveryPedidoGestionarPago: (id, body) =>
    api.post(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}/gestionar-pago`, body),
  deliveryPedidoProcesarPago: (id, body) =>
    api.post(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}/procesar-pago`, body),
  /**
   * Puede responder `text/html` o JSON envuelto; devuelve string HTML para imprimir.
   */
  deliveryPedidoPrecuentaHtml: async (id) => {
    const url = `${getApiUrl()}/api/v1/delivery/pedidos/${encodeURIComponent(id)}/precuenta/html`;
    const token = getToken();
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      const err = new Error(`Precuenta HTML: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();
    if (ct.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        if (json && typeof json === "object" && json.success === false) {
          throw new Error(json.message || json.Message || "Error de API");
        }
        const inner = json?.data ?? json?.Data ?? json;
        if (typeof inner === "string") return inner;
        return inner?.html ?? inner?.Html ?? String(inner ?? "");
      } catch (e) {
        if (e instanceof SyntaxError) return text;
        throw e;
      }
    }
    return text;
  },
};

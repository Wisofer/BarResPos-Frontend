import { normalizeOpcionesSeleccionadas } from "./productoOpciones.js";

/** Body POST/PUT /api/v1/delivery/pedidos */
export function buildDeliveryPedidoBody(customer, cart) {
  const items = cart.map((x) => {
    const o = normalizeOpcionesSeleccionadas(x.opcionesSeleccionadas);
    const row = {
      servicioId: Number(x.id),
      cantidad: Number(x.qty),
      precioUnitario: Number(x.price) > 0 ? Number(x.price) : null,
      estado: null,
      notas: String(x.notas ?? "").trim() || null,
    };
    if (o.length > 0) row.opcionesSeleccionadas = o;
    return row;
  });
  return {
    clienteId: null,
    clienteNombre: String(customer?.nombre ?? "").trim() || null,
    clienteTelefono: String(customer?.telefono ?? "").trim() || null,
    clienteDireccion: String(customer?.direccion ?? "").trim() || null,
    observaciones: String(customer?.observaciones ?? "").trim() || null,
    items,
  };
}

export function mapDeliveryListRow(it) {
  if (!it || typeof it !== "object") return null;
  const id = Number(it.id ?? it.Id);
  if (!Number.isFinite(id)) return null;
  return {
    pedidoId: id,
    codigo: String(it.codigo ?? it.Codigo ?? "").trim() || `#${id}`,
    estado: String(it.estado ?? it.Estado ?? ""),
    estadoCocina: String(it.estadoCocina ?? it.EstadoCocina ?? ""),
    customer: {
      nombre: it.clienteNombre ?? it.ClienteNombre ?? "",
      telefono: it.clienteTelefono ?? it.ClienteTelefono ?? "",
      direccion: it.clienteDireccion ?? it.ClienteDireccion ?? "",
    },
    observaciones: it.observaciones ?? it.Observaciones ?? "",
    total: Number(it.total ?? it.Total ?? 0),
    createdAt: it.createdAt ?? it.CreatedAt ?? it.created_at ?? new Date().toISOString(),
  };
}

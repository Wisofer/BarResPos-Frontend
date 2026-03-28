/**
 * Construye el cuerpo de PUT /pedidos/:id para cambiar solo la mesa,
 * conservando ítems y metadatos (mismo contrato que OrdersView / ensurePosOrderSynced).
 */
export function buildUpdatePedidoPayloadForMesaChange(pedido, mesaIdDestino) {
  const rawItems = pedido?.items ?? pedido?.Items ?? [];
  const items = rawItems
    .map((it) => {
      const servicioId = Number(
        it.servicioId ?? it.ServicioId ?? it.productoId ?? it.ProductoId ?? 0
      );
      const cantidad = Number(it.cantidad ?? it.Cantidad ?? 0);
      const pu = it.precioUnitario ?? it.PrecioUnitario;
      const montoLinea = Number(it.monto ?? it.Monto ?? it.total ?? it.Total ?? 0);
      const precioUnitario =
        pu != null && pu !== ""
          ? Number(pu)
          : cantidad > 0
            ? montoLinea / cantidad
            : Number(it.precio ?? it.Precio ?? 0);

      return {
        servicioId,
        cantidad,
        precioUnitario: Number.isFinite(precioUnitario) ? precioUnitario : 0,
        estado: it.estado ?? it.Estado ?? "Listo",
        notas: it.notas ?? it.Notas ?? "",
      };
    })
    .filter((x) => x.servicioId > 0 && x.cantidad > 0);

  if (items.length === 0) {
    throw new Error("El pedido no tiene líneas válidas para trasladar. Sincroniza la orden e intenta de nuevo.");
  }

  return {
    mesaId: Number(mesaIdDestino),
    clienteId: pedido.clienteId ?? pedido.ClienteId ?? null,
    meseroId: pedido.meseroId ?? pedido.MeseroId ?? null,
    estado: pedido.estado ?? pedido.Estado ?? null,
    estadoCocina: pedido.estadoCocina ?? pedido.EstadoCocina ?? null,
    observaciones: pedido.observaciones ?? pedido.Observaciones ?? null,
    items,
  };
}

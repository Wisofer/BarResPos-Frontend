import {
  normalizeOpcionesSeleccionadas,
  opcionesResumenSoloTextoOpcion,
  opcionesSeleccionadasKey,
  withOpcionesSeleccionadas,
} from "./productoOpciones.js";

/** Líneas del carrito POS → cuerpo `productos` de POST /pos/ordenes. */
export function posCartToPosOrdenProductos(cart) {
  const list = Array.isArray(cart) ? cart : [];
  return list.map((x) =>
    withOpcionesSeleccionadas(
      {
        productoId: Number(x.id),
        cantidad: Number(x.qty),
        notas: String(x.notas ?? "").trim(),
      },
      x.opcionesSeleccionadas
    )
  );
}

/** Líneas del carrito POS → `items` de PUT pedido (servicioId como en el backend actual). */
export function posCartToPedidoItemsPayload(cart) {
  const list = Array.isArray(cart) ? cart : [];
  return list.map((x) =>
    withOpcionesSeleccionadas(
      {
        servicioId: Number(x.id),
        cantidad: Number(x.qty),
        precioUnitario: Number(x.price || 0),
        estado: "Listo",
        notas: String(x.notas ?? "").trim(),
      },
      x.opcionesSeleccionadas
    )
  );
}

/** Respuesta API envuelta { data } | { Data } o cuerpo plano. */
export function unwrapEnvelope(raw) {
  if (raw == null) return raw;
  return raw.data ?? raw.Data ?? raw;
}

export function getOrdenPedidoId(order, fallback = null) {
  if (order == null || typeof order !== "object") return fallback;
  return (
    order.id ??
    order.Id ??
    order.ordenId ??
    order.OrdenId ??
    order.pedidoId ??
    order.PedidoId ??
    fallback
  );
}

export function getOrdenItems(order) {
  if (!order) return undefined;
  return order.items ?? order.Items;
}

/** ID devuelto por POST /pos/ordenes u objetos equivalentes. */
export function extractPosOrdenResponseId(data, fallback = null) {
  if (data == null || typeof data !== "object") return fallback;
  return (
    data.id ??
    data.Id ??
    data.ordenId ??
    data.OrdenId ??
    data.pedidoId ??
    data.PedidoId ??
    data.facturaId ??
    data.FacturaId ??
    data.orden?.id ??
    data.orden?.Id ??
    fallback
  );
}

export function mapBackendItemsToCart(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((it, idx) => {
      const opcionesSeleccionadas = normalizeOpcionesSeleccionadas(
        it?.opcionesSeleccionadas ?? it?.OpcionesSeleccionadas
      );
      const opcionesKey = opcionesSeleccionadasKey(opcionesSeleccionadas);

      const productoId =
        it?.productoId ??
        it?.ProductoId ??
        it?.servicioId ??
        it?.ServicioId ??
        it?.producto?.id ??
        it?.Producto?.Id ??
        it?.servicio?.id ??
        it?.Servicio?.Id ??
        idx;

      const backendLineId = it?.id ?? it?.Id;
      const lineId =
        backendLineId != null && backendLineId !== ""
          ? `b-${String(backendLineId)}`
          : `b-${idx}-${String(productoId)}-${opcionesKey || "x"}`;

      const qty = Number(it?.cantidad ?? it?.Cantidad ?? it?.qty ?? 0);
      const montoLinea = Number(it?.monto ?? it?.Monto ?? it?.total ?? it?.Total ?? it?.importe ?? it?.Importe ?? 0);
      const priceUnit = Number(
        it?.precioUnitario ?? it?.PrecioUnitario ?? it?.precio ?? it?.Precio ?? it?.precioUnitarioServicio ?? 0
      );
      const computedPrice = priceUnit > 0 ? priceUnit : qty > 0 ? montoLinea / qty : 0;
      const name =
        it?.producto?.nombre ??
        it?.Producto?.Nombre ??
        it?.servicio?.nombre ??
        it?.Servicio?.Nombre ??
        it?.nombre ??
        it?.Nombre ??
        it?.productoNombre ??
        it?.ProductoNombre ??
        it?.servicioNombre ??
        it?.ServicioNombre ??
        it?.servicio ??
        it?.Servicio ??
        it?.producto ??
        it?.Producto ??
        "Producto";

      const opcionesResumen = opcionesResumenSoloTextoOpcion(it?.opcionesResumen ?? it?.OpcionesResumen ?? "");
      const notas = String(it?.notas ?? it?.Notas ?? "").trim();

      return {
        lineId,
        id: Number.isNaN(Number(productoId)) ? idx : Number(productoId),
        name: String(name),
        price: Number.isFinite(computedPrice) ? computedPrice : 0,
        qty: qty > 0 ? qty : 0,
        opcionesSeleccionadas,
        opcionesKey,
        opcionesResumen,
        notas,
      };
    })
    .filter((x) => x.qty > 0);
}

/** Líneas para modal de cobro / pre-cuenta local (mismo shape que espera el POS). */
export function posCartToModalLines(cart) {
  return cart.map((x) => {
    const resumen = opcionesResumenSoloTextoOpcion(x.opcionesResumen ?? "");
    const note = String(x.notas ?? "").trim();
    let name = resumen ? `${x.name} — ${resumen}` : x.name;
    if (note) name = `${name} · ${note}`;
    return {
      id: x.lineId ?? x.id,
      name,
      qty: x.qty,
      price: x.price,
      lineTotal: Number(x.price || 0) * Number(x.qty || 0),
    };
  });
}

export function getPedidoMontoNumeric(pedido) {
  const m = pedido?.monto ?? pedido?.Monto ?? pedido?.total ?? pedido?.Total;
  if (m != null && Number.isFinite(Number(m))) return Number(m);
  return null;
}

export function getEstadoCocinaOrden(order) {
  if (!order) return null;
  return (
    order.estadoCocina ??
    order.EstadoCocina ??
    order.estado_cocina ??
    order.Estado_cocina ??
    null
  );
}

export function normalizeApiErrorMessage(msg) {
  return String(msg ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function isCajaCerradaMessageNormalized(normalized) {
  return normalized.includes("caja") && normalized.includes("cerrada");
}

export function isStockShortageConflict409(status, normalized, excludeBecauseCajaCerrada = false) {
  if (status !== 409) return false;
  if (excludeBecauseCajaCerrada) return false;
  return (
    normalized.includes("stock") ||
    normalized.includes("inventario") ||
    normalized.includes("insuficiente") ||
    (normalized.includes("disponible") && normalized.includes("solicit"))
  );
}

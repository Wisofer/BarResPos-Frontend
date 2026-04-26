import { formatCurrency } from "./currency.js";
import { pedidoSubtotalConsumoCordobas, pedidoTotalNetoCobradoCordobas } from "./pedidoCobro.js";

export function mapListadoPedidoToRow(p, i, currencySymbol) {
  const consumo = pedidoSubtotalConsumoCordobas(p);
  const neto = pedidoTotalNetoCobradoCordobas(p);
  const tipo = p.tipo || p.Tipo || null;
  const origenPedido = p.origenPedido || p.OrigenPedido || null;
  const tipoNorm = String(tipo || "").toLowerCase();
  const origenNorm = String(origenPedido || "").toLowerCase();
  const isDelivery = tipoNorm === "delivery" || origenNorm === "delivery";

  return {
    rowId: p.id,
    id: p.codigo || p.numero || `#${1200 + i}`,
    numero: p.numero || null,
    tipo,
    origenPedido,
    table: p.mesa || p.mesaNombre || p.origen || (isDelivery ? "Delivery" : "Mesa"),
    clienteNombre: p.cliente || p.clienteNombre || p.clienteNombreDelivery || "",
    waiter: p.mesero || p.meseroNombre || "-",
    mesaId: p.mesaId || null,
    meseroId: p.meseroId || null,
    clienteId: p.clienteId || null,
    estadoCocina: p.estadoCocina || "",
    observaciones: p.observaciones || "",
    createdAt: p.fechaCreacion || null,
    item: p.descripcion || p.resumen || "Pedido",
    productsCount: Number(p.productosCount || 0),
    total: consumo,
    amount: formatCurrency(consumo, currencySymbol),
    totalNetoCobrado: neto,
    amountNeto: neto != null ? formatCurrency(neto, currencySymbol) : null,
    status: p.estado || "Pendiente",
  };
}

export function mapResumenToCards(resumen) {
  const netoResumen = resumen?.montoTotalCobradoNetoCordobas ?? resumen?.MontoTotalCobradoNetoCordobas;
  const descResumen = resumen?.descuentoTotalCordobas ?? resumen?.DescuentoTotalCordobas ?? 0;
  const consumoResumen =
    resumen?.montoTotalConsumoCordobas ??
    resumen?.MontoTotalConsumoCordobas ??
    resumen?.montoTotal ??
    resumen?.MontoTotal ??
    0;
  const ppt = resumen?.pedidosPorTipo ?? resumen?.PedidosPorTipo ?? {};
  return {
    totalPedidos: Number(resumen?.totalPedidos || 0),
    pagados: Number(resumen?.pagados || 0),
    pendientes: Number(resumen?.pendientes || 0),
    montoTotal: Number(consumoResumen || 0),
    montoTotalCobradoNeto: netoResumen != null && netoResumen !== "" ? Number(netoResumen) : null,
    descuentoTotalCordobas: Number(descResumen || 0),
    /** Llevar cuenta como mesa (misma lógica operativa). */
    pedidosPorTipo: {
      mesa: Number(ppt.mesa ?? ppt.Mesa ?? 0) + Number(ppt.llevar ?? ppt.Llevar ?? 0),
      delivery: Number(ppt.delivery ?? ppt.Delivery ?? 0),
    },
  };
}

import { BarChart3, Boxes, CircleDollarSign, History, Tags, Users } from "lucide-react";

export const reportCards = [
  {
    id: "ventas",
    title: "Reporte de Ventas",
    description: "Ventas por periodo con métricas generales y desglose diario.",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
    button: "Ver reporte",
  },
  {
    id: "productos-top",
    title: "Productos Más Vendidos",
    description: "Top de productos por cantidad vendida y total de ventas.",
    icon: Boxes,
    color: "bg-green-100 text-green-600",
    button: "Ver reporte",
  },
  {
    id: "meseros",
    title: "Ventas por Mesero",
    description: "Rendimiento por mesero para el período seleccionado.",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
    button: "Ver reporte",
  },
  {
    id: "categorias",
    title: "Ventas por Categoría",
    description: "Ventas por categoría con desglose de productos.",
    icon: Tags,
    color: "bg-orange-100 text-orange-600",
    button: "Ver reporte",
  },
  {
    id: "caja",
    title: "Cierre de Caja",
    description: "Historial de cierres y arqueos de caja.",
    icon: CircleDollarSign,
    color: "bg-amber-100 text-amber-600",
    button: "Ver reporte",
  },
  {
    id: "movimientos",
    title: "Movimientos de Inventario",
    description: "Entradas, salidas y ajustes de stock de productos.",
    icon: History,
    color: "bg-red-100 text-red-600",
    button: "Ver reporte",
  },
];

export function reporteMetodoPagoLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const normalized = raw.toLowerCase();
  if (normalized.includes("efect")) return "Efectivo";
  if (normalized.includes("tarj")) return "Tarjeta";
  if (normalized.includes("trans")) return "Transferencia";
  return raw;
}

export function reporteMonedaLabel(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "—";
  if (raw === "C") return "C$";
  if (raw === "USD") return "USD";
  return raw;
}

export function normalizeReporteTicketDetalle(raw) {
  const d = raw || {};
  const itemsRaw = d.lineas ?? d.Lineas ?? d.items ?? d.Items ?? [];
  return {
    kind: "ticket",
    ventaId: d.ventaId ?? d.VentaId ?? d.id ?? d.Id ?? null,
    numero: d.numero ?? d.Numero ?? d.numeroTicket ?? d.NumeroTicket ?? "—",
    estado: d.estado ?? d.Estado ?? "—",
    clienteNombre: d.clienteNombre ?? d.ClienteNombre ?? d.cliente ?? d.Cliente ?? null,
    fecha: d.fecha ?? d.Fecha ?? d.fechaVenta ?? d.FechaVenta ?? "",
    metodoPago: d.metodoPago ?? d.MetodoPago ?? "",
    moneda: d.moneda ?? d.Moneda ?? null,
    cantidadLineas: Number(d.cantidadLineas ?? d.CantidadLineas ?? itemsRaw.length ?? 0),
    cantidadUnidades: Number(d.cantidadUnidades ?? d.CantidadUnidades ?? 0),
    subtotalLineas: Number(d.subtotalLineas ?? d.SubtotalLineas ?? 0),
    totalCobrado: Number(d.totalCobrado ?? d.TotalCobrado ?? d.total ?? d.Total ?? 0),
    items: Array.isArray(itemsRaw)
      ? itemsRaw.map((it) => ({
          detalleId: it.detalleId ?? it.DetalleId ?? null,
          anulado: Boolean(it.anulado ?? it.Anulado ?? false),
          producto: it.productoNombre ?? it.ProductoNombre ?? it.producto ?? it.servicio ?? "—",
          variante: it.variante ?? it.Variante ?? "",
          cantidad: Number(it.cantidad ?? it.Cantidad ?? 0),
          precioUnitario: Number(it.precioUnitario ?? it.PrecioUnitario ?? 0),
          monto: Number(it.totalLinea ?? it.TotalLinea ?? it.monto ?? it.Subtotal ?? 0),
        }))
      : [],
  };
}

import { Eye, Pencil, XCircle } from "lucide-react";
import { orderStatusPillClass, formatDateTimeParts, labelDestinoPedido, labelTipoPedido } from "../../utils/ordersViewFormatters.js";

const th = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500";
const tipoPillClass = (tipo, origenPedido) => {
  const t = String(tipo || origenPedido || "").toLowerCase();
  if (t === "delivery") return "bg-violet-100 text-violet-800";
  return "bg-amber-100 text-amber-800";
};

export function OrdersListTable({
  rows,
  isAdmin,
  busyAction,
  onView,
  onEdit,
  onCancel,
}) {
  return (
    <div className="min-w-0 w-full overflow-x-auto">
      <table className="min-w-[820px] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            <th className={th}>Pedido</th>
            <th className={th}>Tipo</th>
            <th className={th}>Fecha</th>
            <th className={th}>Destino</th>
            <th className={th}>Total</th>
            <th className={th}>Estado</th>
            <th className={`${th} w-[120px] text-right`}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                No hay pedidos con los criterios actuales.
              </td>
            </tr>
          )}
          {rows.map((order) => {
            const dt = formatDateTimeParts(order.createdAt);
            const isEmptyDraft =
              String(order.status || "").toLowerCase() === "guardado" &&
              Number(order.total || 0) <= 0 &&
              Number(order.productsCount || 0) <= 0;
            return (
              <tr key={order.rowId} className="border-b border-slate-100/90 transition hover:bg-slate-50/50">
                <td className="px-4 py-2.5 align-middle">
                  <p className="font-semibold text-slate-900">{order.id}</p>
                </td>
                <td className="px-4 py-2.5 align-middle text-slate-700">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${tipoPillClass(order.tipo, order.origenPedido)}`}>
                    {labelTipoPedido(order.tipo, order.origenPedido)}
                  </span>
                </td>
                <td className="px-4 py-2.5 align-middle text-slate-600">
                  <p className="text-[13px]">{dt.date}</p>
                  {dt.time ? <p className="text-xs text-slate-400 tabular-nums">{dt.time}</p> : null}
                </td>
                <td className="px-4 py-2.5 align-middle text-slate-700">
                  <p>{labelDestinoPedido(order)}</p>
                  {order.tipo === "delivery" && order.clienteNombre ? (
                    <p className="text-xs text-slate-400">Cliente delivery</p>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 align-middle tabular-nums text-slate-700">
                  {order.status === "Pagado" && order.amountNeto != null ? (
                    <span className="font-semibold text-emerald-800">{order.amountNeto}</span>
                  ) : (
                    <span className="font-semibold text-slate-800">{order.amount}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs font-medium ${orderStatusPillClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => onView(order)}
                      disabled={busyAction}
                      title="Ver detalle"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onEdit(order)}
                        disabled={busyAction || isEmptyDraft || order.status === "Pagado" || order.status === "Cancelado"}
                        title="Editar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onCancel(order)}
                        disabled={busyAction || isEmptyDraft || order.status === "Cancelado" || order.status === "Pagado"}
                        title="Cancelar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

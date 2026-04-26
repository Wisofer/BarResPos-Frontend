import { ArrowLeft, Check, Pencil, Printer, X } from "lucide-react";
import { formatCurrency } from "../../utils/currency.js";
import {
  pagoDescuentoAtribuidoCordobas,
  pagoDescuentoMotivo,
  pagoFecha,
  pagoMontoNetoCobradoCordobas,
  pagoTipo,
  pedidoDescuentoCobroCordobas,
  pedidoPagosLista,
  pedidoSubtotalConsumoCordobas,
  pedidoTotalNetoCobradoCordobas,
} from "../../utils/pedidoCobro.js";
import { orderStatusPillClass, formatDateTimeLabel, labelTipoPedido } from "../../utils/ordersViewFormatters.js";

const ESTADOS_PEDIDO = ["Pendiente", "En cocina", "Despacho", "Listo", "Entregado", "Pagado", "Cancelado"];
const ESTADOS_COCINA = ["Pendiente", "En cocina", "Listo", "Entregado", "Cancelado"];
const ESTADOS_LINEA = ["Pendiente", "En cocina", "Listo", "Entregado", "Cancelado"];

function infoCard(label, children) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      {children}
    </article>
  );
}

export function OrderDetailPanel({
  error,
  detailOrder,
  showEdit,
  setShowEdit,
  isAdmin,
  busyAction,
  currencySymbol,
  onBack,
  onPrint,
  onStartEdit,
  editForm,
  setEditForm,
  onSubmitEdit,
}) {
  const createdAtLabel = formatDateTimeLabel(detailOrder.fechaCreacion);
  const paidAtLabel = formatDateTimeLabel(detailOrder.fechaPagado);
  const listoAtLabel = ["Listo", "Servido", "Entregado", "Pagado"].includes(String(detailOrder.estado || "")) ? paidAtLabel : "—";
  const items = Array.isArray(detailOrder.items) ? detailOrder.items : [];
  const subtotalLines = items.reduce((acc, it) => acc + Number(it.monto || 0), 0);
  const subConsumoDetalle = pedidoSubtotalConsumoCordobas(detailOrder) || subtotalLines;
  const descCobroDetalle = pedidoDescuentoCobroCordobas(detailOrder);
  const netoCobradoDetalle = pedidoTotalNetoCobradoCordobas(detailOrder);
  const pagosDetalle = pedidoPagosLista(detailOrder);
  const estadoDetalle = String(detailOrder.estado || "");

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Detalle de pedido</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{detailOrder.numero || `#${detailOrder.id}`}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Volver
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 shrink-0" />
            Imprimir
          </button>
          {isAdmin && !showEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4 shrink-0" />
              Editar
            </button>
          )}
        </div>
      </header>

      {!showEdit ? (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.65fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Información del pedido</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {infoCard(
                  "Número",
                  <p className="font-semibold text-slate-800">{detailOrder.numero || `#${detailOrder.id}`}</p>,
                )}
                {infoCard(
                  "Tipo / origen",
                  <p className="font-semibold text-slate-800">
                    {labelTipoPedido(detailOrder.tipo ?? detailOrder.Tipo, detailOrder.origenPedido ?? detailOrder.OrigenPedido)}
                  </p>,
                )}
                {infoCard("Fecha y hora", <p className="font-semibold text-slate-800">{createdAtLabel}</p>)}
                {infoCard("Mesa", <p className="font-semibold text-slate-800">{detailOrder.mesa || "—"}</p>)}
                {infoCard("Mesero", <p className="font-semibold text-slate-800">{detailOrder.mesero || "—"}</p>)}
                {infoCard(
                  "Estado",
                  <span className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-medium ${orderStatusPillClass(detailOrder.estado || "Pendiente")}`}>
                    {detailOrder.estado || "Pendiente"}
                  </span>,
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2 xl:col-span-2">
                  <p className="text-xs text-slate-500">Observaciones</p>
                  <p className="mt-0.5 font-medium text-slate-700">{detailOrder.observaciones || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Productos</h2>
              <div className="mt-3 min-w-0 overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="pb-2 pl-0 pr-3">Producto</th>
                      <th className="pb-2 pr-3">Cant.</th>
                      <th className="pb-2 pr-3">P. unit.</th>
                      <th className="pb-2 pr-3">Subtotal</th>
                      <th className="pb-2 pr-0">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {items.map((it) => (
                      <tr key={it.id || `${it.servicioId}-${it.servicio}`}>
                        <td className="py-2.5 pr-3 font-medium">{it.servicio || "—"}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{it.cantidad || 0}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{formatCurrency(it.precioUnitario || 0, currencySymbol)}</td>
                        <td className="py-2.5 pr-3 font-semibold tabular-nums">{formatCurrency(it.monto || 0, currencySymbol)}</td>
                        <td className="max-w-xs py-2.5 text-slate-600">{it.notas || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-2 text-right text-sm font-medium text-slate-600">
                        Total consumo
                      </td>
                      <td className="pt-2 text-sm font-bold tabular-nums text-slate-900">{formatCurrency(subConsumoDetalle, currencySymbol)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Cobro</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Subtotal consumo</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(subConsumoDetalle, currencySymbol)}</dd>
                </div>
                {descCobroDetalle > 0.0001 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Descuento</dt>
                    <dd className="font-semibold text-amber-800">−{formatCurrency(descCobroDetalle, currencySymbol)}</dd>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600">Total pagado (neto)</dt>
                    <dd className="font-bold tabular-nums text-emerald-800">
                      {estadoDetalle === "Pagado" && netoCobradoDetalle != null ? formatCurrency(netoCobradoDetalle, currencySymbol) : "—"}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {pagosDetalle.length > 0 && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-900">Pagos</h2>
                <div className="mt-3 min-w-0 overflow-x-auto">
                  <table className="w-full min-w-full text-xs">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="font-medium">Fecha</th>
                        <th className="font-medium">Tipo</th>
                        <th className="text-right font-medium">Neto</th>
                        <th className="text-right font-medium">Desc.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {pagosDetalle.map((pg, idx) => {
                        const pid = pg.id ?? pg.Id ?? `pago-${idx}`;
                        const netoP = pagoMontoNetoCobradoCordobas(pg);
                        const descA = pagoDescuentoAtribuidoCordobas(pg);
                        const motivo = pagoDescuentoMotivo(pg);
                        return (
                          <tr key={pid}>
                            <td className="whitespace-nowrap py-1.5 pr-2">{formatDateTimeLabel(pagoFecha(pg))}</td>
                            <td className="py-1.5 pr-2">{pagoTipo(pg)}</td>
                            <td className="py-1.5 pr-2 text-right font-medium">{netoP != null ? formatCurrency(netoP, currencySymbol) : "—"}</td>
                            <td className="py-1.5 text-right" title={motivo || undefined}>
                              {descA > 0.0001 ? `−${formatCurrency(descA, currencySymbol)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Fechas</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>
                  Creado: <span className="font-medium">{createdAtLabel}</span>
                </li>
                <li>
                  Listo: <span className="font-medium">{listoAtLabel}</span>
                </li>
                <li>
                  Pagado: <span className="font-medium">{paidAtLabel}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <form onSubmit={onSubmitEdit} className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Modo edición</p>
            <p className="mt-0.5 text-xs text-amber-900/90">Guardá los cambios o cancelá para volver al detalle.</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">Datos del pedido</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">
                Mesa ID
                <input
                  type="number"
                  min="1"
                  value={editForm.mesaId}
                  onChange={(e) => setEditForm((s) => ({ ...s, mesaId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/60"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Cliente ID
                <input
                  type="number"
                  min="0"
                  value={editForm.clienteId}
                  onChange={(e) => setEditForm((s) => ({ ...s, clienteId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/60"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Mesero ID
                <input
                  type="number"
                  min="0"
                  value={editForm.meseroId}
                  onChange={(e) => setEditForm((s) => ({ ...s, meseroId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/60"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Estado del pedido
                <select
                  value={editForm.estado}
                  onChange={(e) => setEditForm((s) => ({ ...s, estado: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                >
                  {ESTADOS_PEDIDO.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Estado cocina
                <select
                  value={editForm.estadoCocina}
                  onChange={(e) => setEditForm((s) => ({ ...s, estadoCocina: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Sin definir</option>
                  {ESTADOS_COCINA.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Observaciones
              <textarea
                value={editForm.observaciones}
                onChange={(e) => setEditForm((s) => ({ ...s, observaciones: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">Líneas</h2>
            <div className="mt-4 space-y-4">
              {editForm.items.map((it, idx) => {
                const q = Number(it.cantidad) || 0;
                const pu = Number(it.precioUnitario) || 0;
                const sub = q * pu;
                return (
                  <div key={`${it.servicioId}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{it.servicio || "Producto"}</p>
                        <p className="text-xs text-slate-500">Línea {idx + 1}</p>
                      </div>
                      <span className="rounded-md bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-800 ring-1 ring-slate-200">
                        {formatCurrency(sub, currencySymbol)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-1">
                        ID servicio
                        <input
                          type="number"
                          min="1"
                          value={it.servicioId === undefined || it.servicioId === null ? "" : String(it.servicioId)}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              items: s.items.map((x, i) => (i === idx ? { ...x, servicioId: e.target.value } : x)),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Cantidad
                        <input
                          type="number"
                          min="1"
                          value={it.cantidad}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              items: s.items.map((x, i) => (i === idx ? { ...x, cantidad: e.target.value } : x)),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        P. unit. ({currencySymbol})
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.precioUnitario}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              items: s.items.map((x, i) => (i === idx ? { ...x, precioUnitario: e.target.value } : x)),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Estado línea
                        <select
                          value={it.estado}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              items: s.items.map((x, i) => (i === idx ? { ...x, estado: e.target.value } : x)),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Sin definir</option>
                          {ESTADOS_LINEA.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-slate-600">
                      Notas
                      <input
                        value={it.notas}
                        onChange={(e) =>
                          setEditForm((s) => ({
                            ...s,
                            items: s.items.map((x, i) => (i === idx ? { ...x, notas: e.target.value } : x)),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto w-full"
            >
              <X className="h-4 w-4 shrink-0" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busyAction}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto w-full"
            >
              <Check className="h-4 w-4 shrink-0" />
              {busyAction ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

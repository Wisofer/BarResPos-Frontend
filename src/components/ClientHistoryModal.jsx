import { useEffect } from "react";
import { Modal, Badge, Pagination } from "./ui";
import { useClientHistory } from "../hooks/useClientHistory";
import { formatCurrency, formatDate, formatDateTime, formatAmountByPaymentMethod } from "../utils/format";
import { formatPaymentMethod } from "../utils/paymentMethod";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  FileText,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { cn } from "../utils/cn";

import { STATUS_VARIANT } from "../constants/statusVariants";

function Section({ icon: Icon, title, children, className }) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ClientHistoryModal({ clientId, open, onClose }) {
  const { data, loading, error, page, pageSize, totalPages, fetchHistory, clear, loadPage } = useClientHistory();

  useEffect(() => {
    if (open && clientId) fetchHistory(clientId);
    if (!open) clear();
  }, [open, clientId, fetchHistory, clear]);

  const client = data?.client;
  const reservations = data?.reservations?.items ?? [];
  const invoices = data?.invoices?.items ?? [];
  const sales = data?.sales?.items ?? [];
  const activity = data?.activity || [];
  const totalCount =
    (data?.reservations?.totalCount ?? 0) +
    (data?.invoices?.totalCount ?? 0) +
    (data?.sales?.totalCount ?? 0);

  return (
    <Modal open={open} onClose={onClose} title="Historial del cliente" size="3xl">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-200" role="alert">
          {error}
        </p>
      )}
      {!loading && data && (
        <div className="space-y-8">
          {/* Tarjeta del cliente */}
          {client && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-xl font-bold text-primary-700">
                  {(client.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{client.name}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {client.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </span>
                    )}
                    {client.graduacion_od != null && client.graduacion_od !== "" && (
                      <span>OD: {client.graduacion_od}</span>
                    )}
                    {client.graduacion_oi != null && client.graduacion_oi !== "" && (
                      <span>OI: {client.graduacion_oi}</span>
                    )}
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-1.5 hover:text-primary-600"
                      >
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    )}
                    {client.phone && (
                      <a
                        href={`tel:${client.phone.replace(/\s/g, "")}`}
                        className="flex items-center gap-1.5 hover:text-primary-600"
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{client.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-2">
            <div className="space-y-6">
              {sales.length > 0 && (
                <Section icon={ShoppingBag} title="Ventas">
                  <ul className="space-y-2">
                    {sales.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">Venta {s.id}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {s.date ? formatDate(s.date.slice(0, 10)) : "—"}
                          </p>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                          {formatCurrency(s.total ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {reservations.length > 0 && (
                <Section icon={CalendarDays} title="Pedidos">
                  <ul className="space-y-2">
                    {reservations.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{r.destination}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(r.startDate)} – {formatDate(r.endDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                            {formatAmountByPaymentMethod(r.amount, r.paymentMethod)}
                          </span>
                          <Badge variant={STATUS_VARIANT[r.paymentStatus] || "default"} className="shrink-0">
                            {r.paymentStatus}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">· {formatPaymentMethod(r.paymentMethod)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {invoices.length > 0 && (
                <Section icon={FileText} title="Facturas">
                  <ul className="space-y-2">
                    {invoices.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            #{i.id} · {i.concept || "Factura"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(i.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                            {formatAmountByPaymentMethod(i.amount, i.paymentMethod)}
                          </span>
                          <Badge variant={STATUS_VARIANT[i.status] || "default"} className="shrink-0">
                            {i.status}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">· {formatPaymentMethod(i.paymentMethod)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            {/* Columna derecha: Actividad (timeline) */}
            <div className="lg:col-span-1">
              {activity.length > 0 && (
                <Section icon={Clock} title="Actividad reciente">
                  <ul className="relative space-y-0 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
                    {activity.map((a, index) => (
                      <li key={a.id} className="relative pb-4 last:pb-0">
                        <span
                          className="absolute -left-[1.375rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-400 ring-2 ring-white dark:ring-slate-900"
                          aria-hidden
                        />
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {formatDateTime(a.time)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{a.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={loadPage}
              />
            </div>
          )}

          {!client && reservations.length === 0 && invoices.length === 0 && sales.length === 0 && activity.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 py-12 text-center">
              <User className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-slate-500 dark:text-slate-400">Sin historial aún</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

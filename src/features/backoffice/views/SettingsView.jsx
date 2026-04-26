import { useEffect, useState } from "react";
import { DollarSign, KeyRound, Pencil, Trash2 } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficeDialog, BackofficeListSkeletonLoading, BackofficePageShell } from "../components/index.js";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { cn } from "../../../utils/cn.js";
import {
  modalFormBodyScrollClass,
  modalFormFooterClass,
  modalFormRootClass,
  modalInputTouchClass,
} from "../utils/modalResponsiveClasses.js";
import { POS_EXCHANGE_RATE_UPDATED_EVENT } from "../constants/posEvents.js";
import { tipoCambioInputTextFromApi } from "../utils/currency.js";

const PIN_PEDIDOS_KEY = "PinCancelacionPedidos";

async function persistTipoCambioServidor(n) {
  if (!Number.isFinite(n) || n <= 0) return;
  await backofficeApi.updateTipoCambio(n);
  window.dispatchEvent(new CustomEvent(POS_EXCHANGE_RATE_UPDATED_EVENT));
}

function findPinInSettings(settings) {
  const list = Array.isArray(settings) ? settings : [];
  for (const cfg of list) {
    if (String(cfg?.clave ?? cfg?.Clave ?? "") === PIN_PEDIDOS_KEY) {
      const value = cfg?.valor ?? cfg?.Valor;
      return value != null ? String(value) : "";
    }
  }
  return "";
}

async function persistPinPedidos(code) {
  const raw = String(code ?? "").trim();
  if (!raw) throw new Error("Ingresa el PIN o código de confirmación.");
  await backofficeApi.upsertConfiguracion(
    PIN_PEDIDOS_KEY,
    raw,
    "PIN global para cancelar pedidos (listado, POS y delivery).",
  );
}

export function SettingsView() {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({ clave: "", valor: "", descripcion: "" });
  const [templates, setTemplates] = useState([]);
  const [templatesActivas, setTemplatesActivas] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    id: null,
    nombre: "",
    contenido: "",
    activa: true,
    predeterminada: false,
  });
  const [alertasStockMinimo, setAlertasStockMinimo] = useState(true);
  const [sonidosNotificacion, setSonidosNotificacion] = useState(true);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState({ open: false, id: null });
  const [pinCancelacionInput, setPinCancelacionInput] = useState("");
  const [tipoCambioInput, setTipoCambioInput] = useState(() => tipoCambioInputTextFromApi(null));

  const loadAll = async () => {
    const [config, tmpl, tc] = await Promise.all([
      backofficeApi.configuraciones(),
      backofficeApi.listPlantillasWhatsapp(templatesActivas === "" ? {} : { activas: templatesActivas }),
      backofficeApi.configuracionTipoCambio().catch(() => null),
    ]);
    const list = Array.isArray(config) ? config : config?.items || [];
    setSettings(list);
    setPinCancelacionInput(findPinInSettings(list));
    setTemplates(Array.isArray(tmpl) ? tmpl : tmpl?.items || []);
    setTipoCambioInput(tipoCambioInputTextFromApi(tc));
  };

  useEffect(() => {
    let mounted = true;
    loadAll()
      .catch((e) => mounted && setError(e.message || "No se pudo cargar configuraciones."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const reloadTemplates = async (activas = templatesActivas) => {
    const data = await backofficeApi.listPlantillasWhatsapp(activas === "" ? {} : { activas });
    setTemplates(Array.isArray(data) ? data : data?.items || []);
  };

  const openConfigEditor = (cfg) => {
    setConfigForm({
      clave: cfg?.clave || "",
      valor: cfg?.valor != null ? String(cfg.valor) : "",
      descripcion: cfg?.descripcion || "",
    });
    setModalOpen(true);
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await backofficeApi.upsertConfiguracion(configForm.clave, configForm.valor, configForm.descripcion);
      const claveNorm = String(configForm.clave || "").trim().toLowerCase();
      if (claveNorm === "tipocambiodolar") {
        const n = Number(String(configForm.valor).replace(",", "."));
        await persistTipoCambioServidor(n).catch(() => {});
      }
      await loadAll();
      setModalOpen(false);
      snackbar.success("Configuración guardada.");
    } catch (e2) {
      snackbar.error(e2.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const openTemplateCreate = () => {
    setTemplateForm({
      id: null,
      nombre: "",
      contenido: "",
      activa: true,
      predeterminada: false,
    });
    setTemplateModalOpen(true);
  };

  const openTemplateEdit = async (id) => {
    setSaving(true);
    setError("");
    try {
      const t = await backofficeApi.getPlantillaWhatsapp(id);
      setTemplateForm({
        id: t.id,
        nombre: t.nombre || "",
        contenido: t.contenido || t.mensaje || "",
        activa: t.activa !== false,
        predeterminada: Boolean(t.predeterminada || t.esDefault),
      });
      setTemplateModalOpen(true);
    } catch (e) {
      setError(e.message || "No se pudo cargar plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const nombre = String(templateForm.nombre || "").trim();
      const mensaje = String(templateForm.contenido || "").trim();
      if (!nombre || !mensaje) {
        snackbar.error("Nombre y mensaje son requeridos.");
        return;
      }
      const body = {
        nombre,
        /** Backend actual usa `mensaje`; `contenido` se conserva por compatibilidad. */
        mensaje,
        contenido: mensaje,
        activa: Boolean(templateForm.activa),
      };
      let templateId = templateForm.id;
      if (templateForm.id) {
        await backofficeApi.updatePlantillaWhatsapp(templateForm.id, body);
      } else {
        const created = await backofficeApi.createPlantillaWhatsapp(body);
        templateId = created?.id || created?.plantillaId || null;
      }
      if (templateForm.predeterminada && templateId) {
        await backofficeApi.marcarDefaultPlantillaWhatsapp(templateId);
      }
      await reloadTemplates();
      setTemplateModalOpen(false);
      snackbar.success("Plantilla guardada.");
    } catch (e2) {
      snackbar.error(e2.message || "No se pudo guardar plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deletePlantillaWhatsapp(id);
      await reloadTemplates();
      snackbar.success("Plantilla eliminada.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo eliminar plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const saveTipoCambioDolar = async () => {
    const n = Number(String(tipoCambioInput).replace(",", ".").trim());
    if (!Number.isFinite(n) || n <= 0) {
      snackbar.error("Ingresa un tipo de cambio válido (mayor que 0).");
      return;
    }
    setSaving(true);
    try {
      await persistTipoCambioServidor(n);
      await loadAll();
      snackbar.success("Tipo de cambio actualizado. El POS usará este valor al cobrar en USD.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo guardar el tipo de cambio.");
    } finally {
      setSaving(false);
    }
  };

  const savePinCancelacion = async () => {
    setSaving(true);
    try {
      await persistPinPedidos(pinCancelacionInput);
      await loadAll();
      snackbar.success("PIN de cancelación actualizado.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo guardar el PIN.");
    } finally {
      setSaving(false);
    }
  };

  const makeDefaultTemplate = async (id) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.marcarDefaultPlantillaWhatsapp(id);
      await reloadTemplates();
      snackbar.success("Plantilla marcada como predeterminada.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo marcar como predeterminada.");
    } finally {
      setSaving(false);
    }
  };

  const filteredParametros = settings.filter((s) => {
    const k = String(s?.clave ?? s?.Clave ?? "").toLowerCase();
    return k !== "tipocambiodolar" && k !== "pincancelacionpedidos" && k !== "codigocancelacionventa";
  });

  if (loading) return <BackofficeListSkeletonLoading rows={5} maxWidth="5xl" />;
  return (
    <BackofficePageShell maxWidth="5xl" className="pb-8">
      <p className="mb-6 text-sm text-slate-600">Moneda, tipo de cambio, avisos de stock y plantillas de WhatsApp.</p>

      {error && (
        <div className="mb-6 animate-in slide-in-from-top-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600 fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="space-y-8 md:col-span-12 lg:col-span-7">
          <section className="grid grid-cols-1 gap-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <span className="text-sm font-bold uppercase">{user?.nombreUsuario?.[0] || user?.usuario?.[0] || "U"}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{user?.nombreUsuario || user?.usuario || "Usuario"}</h3>
                  <p className="text-xs text-slate-500">{user?.rol || "Admin"}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <DollarSign className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tipo de cambio (dólar)</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="tipo-cambio-usd" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  1 USD = C$
                </label>
                <input
                  id="tipo-cambio-usd"
                  type="text"
                  inputMode="decimal"
                  value={tipoCambioInput}
                  onChange={(e) => setTipoCambioInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder={tipoCambioInputTextFromApi(null)}
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveTipoCambioDolar()}
                disabled={saving}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Guardar tipo de cambio
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <KeyRound className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Código de devolución/cancelación</h3>
            </div>
            <p className="mb-2 text-xs text-slate-500">Usado al cancelar pedidos desde el listado, el POS (mesas) y delivery.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="pin-cancelacion-venta"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  PIN / código de confirmación
                </label>
                <input
                  id="pin-cancelacion-venta"
                  type="password"
                  autoComplete="new-password"
                  value={pinCancelacionInput}
                  onChange={(e) => setPinCancelacionInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Ingresa código"
                />
              </div>
              <button
                type="button"
                onClick={() => void savePinCancelacion()}
                disabled={saving}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Guardar código
              </button>
            </div>
          </section>

          {filteredParametros.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Parámetros del sistema</h3>
              <ul className="divide-y divide-slate-100">
                {filteredParametros.map((cfg, i) => {
                  const clave = cfg?.clave ?? cfg?.Clave ?? `cfg-${i}`;
                  const valor = cfg?.valor ?? cfg?.Valor ?? "";
                  return (
                    <li
                      key={String(clave)}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{clave}</p>
                        <p className="truncate text-xs text-slate-500">{String(valor)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openConfigEditor(cfg)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Preferencias del POS</h3>
            <div className="divide-y divide-slate-100">
              {[
                { label: "Alertas Stock Mínimo", desc: "Avisar cuando se agota", state: alertasStockMinimo, setter: setAlertasStockMinimo },
                { label: "Sonidos de Notificación", desc: "Feedback auditivo (Vol 30%)", state: sonidosNotificacion, setter: setSonidosNotificacion },
              ].map((pref, i) => (
                <div key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{pref.label}</p>
                    <p className="text-xs text-slate-500">{pref.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pref.setter((v) => !v)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      pref.state ? "bg-slate-900" : "bg-slate-200",
                    )}
                    aria-pressed={pref.state}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                        pref.state ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="md:col-span-12 lg:col-span-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">WhatsApp Marketing</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Plantillas de Factura</p>
                </div>
                <select
                  value={templatesActivas}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setTemplatesActivas(v);
                    await reloadTemplates(v);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600"
                >
                  <option value="">Todas</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Plantillas</p>
                <button
                  type="button"
                  onClick={openTemplateCreate}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white transition-all active:scale-95"
                >
                  + NUEVA
                </button>
              </div>

              <div className="space-y-3">
                {templates.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Vacío</p>
                  </div>
                )}
                {templates.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm"
                  >
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          {t.nombre || "Sin Nombre"}
                          {(t.predeterminada || t.esDefault) && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 ring-1 ring-emerald-100">
                              DEFAULT
                            </span>
                          )}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTemplate({ open: true, id: t.id })}
                          className="text-slate-300 hover:text-red-500"
                          aria-label="Eliminar plantilla"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                        {t.contenido || t.mensaje || "Sin contenido…"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openTemplateEdit(t.id)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900"
                      >
                        EDITAR
                      </button>
                      <button
                        type="button"
                        onClick={() => makeDefaultTemplate(t.id)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        DEFAULT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <BackofficeDialog maxWidthClass="max-w-md" onBackdropClick={saving ? undefined : () => setModalOpen(false)}>
          <form onSubmit={saveConfig} className={modalFormRootClass}>
            <h3 className="shrink-0 text-lg font-semibold text-slate-800">Editar configuración</h3>
            <div className={modalFormBodyScrollClass}>
              <input
                value={configForm.clave}
                onChange={(e) => setConfigForm((f) => ({ ...f, clave: e.target.value }))}
                placeholder="Clave"
                className={modalInputTouchClass}
                required
              />
              <input
                value={configForm.valor}
                onChange={(e) => setConfigForm((f) => ({ ...f, valor: e.target.value }))}
                placeholder="Valor"
                className={modalInputTouchClass}
                required
              />
              <textarea
                value={configForm.descripcion}
                onChange={(e) => setConfigForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción (opcional)"
                className={modalInputTouchClass}
                rows={3}
              />
            </div>
            <div className={modalFormFooterClass}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </BackofficeDialog>
      )}
      {templateModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-lg" onBackdropClick={saving ? undefined : () => setTemplateModalOpen(false)}>
          <form onSubmit={saveTemplate} className={modalFormRootClass}>
            <h3 className="shrink-0 text-lg font-semibold text-slate-800">
              {templateForm.id ? "Editar plantilla WhatsApp" : "Nueva plantilla WhatsApp"}
            </h3>
            <div className={modalFormBodyScrollClass}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre *</label>
                <input
                  value={templateForm.nombre}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Plantilla por Defecto"
                  className={modalInputTouchClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mensaje *</label>
                <textarea
                  value={templateForm.contenido}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, contenido: e.target.value }))}
                  placeholder={"Hola {NombreCliente},\n\nLe enviamos su factura:\n📄 Factura: {NumeroFactura}\n💰 Monto: C$ {Monto}\n…"}
                  className={modalInputTouchClass}
                  rows={8}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Usa las variables: {"{NombreCliente}"}, {"{NumeroFactura}"}, {"{Monto}"}, {"{Mes}"}, {"{Categoria}"}, {"{Estado}"},{" "}
                  {"{EnlacePDF}"}
                </p>
                <p className="mt-1 text-xs text-primary-700">Puedes personalizar el mensaje libremente y dejar solo las variables que necesites.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={templateForm.activa} onChange={(e) => setTemplateForm((f) => ({ ...f, activa: e.target.checked }))} />
                Activa
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={templateForm.predeterminada}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, predeterminada: e.target.checked }))}
                />
                Marcar como predeterminada
              </label>
            </div>
            <div className={modalFormFooterClass}>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </BackofficeDialog>
      )}
      <ConfirmModal
        open={confirmDeleteTemplate.open}
        onClose={() => setConfirmDeleteTemplate({ open: false, id: null })}
        onConfirm={async () => {
          if (confirmDeleteTemplate.id) await removeTemplate(confirmDeleteTemplate.id);
        }}
        title="Eliminar plantilla"
        message="¿Deseas eliminar esta plantilla de WhatsApp?"
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </BackofficePageShell>
  );
}

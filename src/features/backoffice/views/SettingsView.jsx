import { useEffect, useState } from "react";
import { MessageSquareText, Pencil, Settings2 } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficeDialog, BackofficeListSkeletonLoading } from "../components/index.js";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";

export function SettingsView() {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const [settings, setSettings] = useState([]);
  const [tipoCambio, setTipoCambio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tipoCambioInput, setTipoCambioInput] = useState("");
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

  const loadAll = async () => {
    const [config, tc, tmpl] = await Promise.all([
      backofficeApi.configuraciones(),
      backofficeApi.configuracionTipoCambio(),
      backofficeApi.listPlantillasWhatsapp(templatesActivas === "" ? {} : { activas: templatesActivas }),
    ]);
    const list = Array.isArray(config) ? config : config?.items || [];
    setSettings(list);
    const tcValue = tc?.tipoCambioDolar ?? tc?.TipoCambioDolar ?? tc?.valor ?? null;
    setTipoCambio(tcValue);
    setTipoCambioInput(tcValue ?? "");
    setTemplates(Array.isArray(tmpl) ? tmpl : tmpl?.items || []);
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

  const saveTipoCambio = async () => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.updateTipoCambio(Number(tipoCambioInput));
      await loadAll();
      snackbar.success("Tipo de cambio actualizado.");
    } catch (e) {
      snackbar.error(e.message || "No se pudo actualizar tipo de cambio.");
    } finally {
      setSaving(false);
    }
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
      const body = {
        nombre: templateForm.nombre,
        contenido: templateForm.contenido,
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

  if (loading) return <BackofficeListSkeletonLoading rows={5} />;
  const normalizedSettings = settings.filter((s) => String(s?.clave || "").toLowerCase() !== "tipocambiodolar");
  return (
    <div className="min-w-0 max-w-full space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Usuario actual</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{user?.nombreUsuario || user?.usuario || "Usuario"}</p>
              <p className="text-xs text-slate-500">{user?.rol || "Sin rol"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-600" />
                <p className="text-sm font-semibold text-slate-800">Tipo de cambio</p>
              </div>
              <p className="text-xs text-slate-500">Actual: {tipoCambio ?? "N/D"}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipoCambioInput}
                  onChange={(e) => setTipoCambioInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button onClick={saveTipoCambio} disabled={saving} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  {saving ? "..." : "OK"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Parámetros</h2>
              <button
                onClick={() => openConfigEditor({ clave: "", valor: "", descripcion: "" })}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Nueva clave
              </button>
            </div>
            <div className="space-y-2">
              {normalizedSettings.length === 0 && <p className="text-sm text-slate-500">Sin configuraciones para mostrar.</p>}
              {normalizedSettings.slice(0, 6).map((s, i) => (
                <div key={s.id || s.clave || i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{s.clave || "config"}</p>
                    <p className="truncate text-xs text-slate-500">{String(s.valor ?? "")}</p>
                  </div>
                  <button onClick={() => openConfigEditor(s)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Alertas de Stock Mínimo</p>
              <p className="mt-1 text-xs text-slate-500">Alertas cuando productos llegan a stock mínimo.</p>
              <label className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs font-semibold text-slate-700">{alertasStockMinimo ? "Activadas" : "Desactivadas"}</span>
                <button
                  type="button"
                  onClick={() => setAlertasStockMinimo((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    alertasStockMinimo ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      alertasStockMinimo ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Sonidos de Notificación</p>
              <p className="mt-1 text-xs text-slate-500">Sonidos en notificaciones éxito/error. Volumen 30%.</p>
              <label className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-xs font-semibold text-slate-700">{sonidosNotificacion ? "Activados" : "Desactivados"}</span>
                <button
                  type="button"
                  onClick={() => setSonidosNotificacion((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sonidosNotificacion ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      sonidosNotificacion ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <MessageSquareText className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Plantillas WhatsApp</h2>
            </div>
            <select
              value={templatesActivas}
              onChange={async (e) => {
                const v = e.target.value;
                setTemplatesActivas(v);
                await reloadTemplates(v);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          <div className="mb-3 flex justify-end">
            <button
              onClick={openTemplateCreate}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Nueva plantilla
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {templates.length === 0 && <p className="text-sm text-slate-500">Sin plantillas para mostrar.</p>}
            {templates.map((t, i) => (
              <div key={t.id || i} className="flex min-h-[150px] flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-800">
                    {t.nombre || "Plantilla"}
                    {(t.predeterminada || t.esDefault) && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">DEFAULT</span>}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500">{t.contenido || t.mensaje || "-"}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button onClick={() => openTemplateEdit(t.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                  <button onClick={() => makeDefaultTemplate(t.id)} className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
                    Default
                  </button>
                  <button onClick={() => setConfirmDeleteTemplate({ open: true, id: t.id })} className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {modalOpen && (
        <BackofficeDialog maxWidthClass="max-w-md" onBackdropClick={saving ? undefined : () => setModalOpen(false)}>
          <form onSubmit={saveConfig} className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">Editar configuración</h3>
            <div className="mt-4 space-y-3">
              <input value={configForm.clave} onChange={(e) => setConfigForm((f) => ({ ...f, clave: e.target.value }))} placeholder="Clave" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={configForm.valor} onChange={(e) => setConfigForm((f) => ({ ...f, valor: e.target.value }))} placeholder="Valor" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <textarea value={configForm.descripcion} onChange={(e) => setConfigForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cancelar</button>
              <button disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </BackofficeDialog>
      )}
      {templateModalOpen && (
        <BackofficeDialog maxWidthClass="max-w-lg" onBackdropClick={saving ? undefined : () => setTemplateModalOpen(false)}>
          <form onSubmit={saveTemplate} className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">{templateForm.id ? "Editar plantilla WhatsApp" : "Nueva plantilla WhatsApp"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre *</label>
                <input
                  value={templateForm.nombre}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Plantilla por Defecto"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mensaje *</label>
                <textarea
                  value={templateForm.contenido}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, contenido: e.target.value }))}
                  placeholder={"Hola {NombreCliente},\n\nLe enviamos su factura:\n📄 Factura: {NumeroFactura}\n💰 Monto: C$ {Monto}\n..."}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={8}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Usa las variables: {"{NombreCliente}"}, {"{NumeroFactura}"}, {"{Monto}"}, {"{Mes}"}, {"{Categoria}"}, {"{Estado}"}, {"{EnlacePDF}"}
                </p>
                <p className="mt-1 text-xs text-primary-700">
                  Puedes personalizar el mensaje libremente y dejar solo las variables que necesites.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={templateForm.activa} onChange={(e) => setTemplateForm((f) => ({ ...f, activa: e.target.checked }))} />
                Activa
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={templateForm.predeterminada} onChange={(e) => setTemplateForm((f) => ({ ...f, predeterminada: e.target.checked }))} />
                Marcar como predeterminada
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setTemplateModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cancelar</button>
              <button disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? "Guardando..." : "Guardar"}</button>
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
    </div>
  );
}

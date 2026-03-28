import { BackofficeDialog } from "../../components/index.js";

export function ProviderFormModal({ open, form, setForm, saving, onSubmit, onClose }) {
  if (!open) return null;

  return (
    <BackofficeDialog maxWidthClass="max-w-lg" onBackdropClick={saving ? undefined : onClose}>
      <form onSubmit={onSubmit} className="w-full min-w-0">
        <h3 className="text-lg font-semibold text-slate-800">{form.id ? "Editar proveedor" : "Nuevo proveedor"}</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre o razón social"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Contacto
            <input
              value={form.contacto}
              onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
              placeholder="Persona de contacto"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Teléfono
            <input
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="Teléfono"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">
            Dirección
            <input
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              placeholder="Dirección"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              placeholder="Notas internas"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
            Activo
          </label>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto"
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </BackofficeDialog>
  );
}

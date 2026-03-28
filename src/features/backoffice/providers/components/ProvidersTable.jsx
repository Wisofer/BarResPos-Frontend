import { Pencil, Trash2 } from "lucide-react";

function providerLabel(p) {
  return p.nombre || p.razonSocial || `Proveedor ${p.id}`;
}

function isActivo(p) {
  return (p.activo ?? p.Activo) !== false;
}

function estadoClass(activo) {
  return activo
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-100 text-slate-600";
}

export function ProvidersTable({ providers, busy, onEdit, onRequestDelete }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Contacto</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Dirección</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {providers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  No hay proveedores registrados.
                </td>
              </tr>
            )}
            {providers.map((p) => {
              const activo = isActivo(p);
              const dir = p.direccion || p.Direccion || "";
              return (
                <tr key={p.id} className={`align-top ${!activo ? "bg-slate-50/80" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{providerLabel(p)}</p>
                    <p className="text-xs text-slate-500">ID {p.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.contacto || p.Contacto || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{p.telefono || p.Telefono || "—"}</td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-700">
                    <span className="line-clamp-2 break-all">{p.email || p.Email || "—"}</span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">
                    <span className="line-clamp-2 text-xs leading-relaxed">{dir || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${estadoClass(activo)}`}>
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(p.id)}
                        disabled={busy}
                        title="Editar proveedor"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(p.id, providerLabel(p))}
                        disabled={busy}
                        title="Desactivar proveedor"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

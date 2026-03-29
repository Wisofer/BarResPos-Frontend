import { useEffect, useMemo, useState } from "react";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { BackofficeDialog } from "./BackofficeDialog.jsx";
import { formatCurrency } from "../utils/currency.js";
import {
  effectiveMaxSeleccion,
  effectiveMinSeleccion,
  normalizeOpcionesGrupos,
  validarYConstruirSeleccion,
} from "../utils/productoOpciones.js";

function sortGrupos(grupos) {
  return [...grupos].sort((a, b) => {
    const oa = Number(a?.orden ?? a?.Orden ?? 0);
    const ob = Number(b?.orden ?? b?.Orden ?? 0);
    return oa - ob;
  });
}

function sortOpciones(opts) {
  return [...opts].sort((a, b) => {
    const oa = Number(a?.orden ?? a?.Orden ?? 0);
    const ob = Number(b?.orden ?? b?.Orden ?? 0);
    return oa - ob;
  });
}

export function PosProductOpcionesModal({ open, product, currencySymbol = "C$", onClose, onConfirm }) {
  const snackbar = useSnackbar();
  const grupos = useMemo(() => {
    const raw = sortGrupos(normalizeOpcionesGrupos(product));
    return raw.filter((g) => {
      const opts = g?.opciones ?? g?.Opciones ?? [];
      return opts.some((o) => o?.activo !== false && o?.Activo !== false);
    });
  }, [product]);

  const [seleccionPorGrupo, setSeleccionPorGrupo] = useState(() => new Map());

  useEffect(() => {
    if (open) setSeleccionPorGrupo(new Map());
  }, [open, product?.id]);

  const toggleOpcion = (grupoId, opcionId, maxSel) => {
    setSeleccionPorGrupo((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(grupoId) || []);
      if (set.has(opcionId)) {
        set.delete(opcionId);
      } else {
        if (Number.isFinite(maxSel) && maxSel === 1) {
          set.clear();
          set.add(opcionId);
        } else if (Number.isFinite(maxSel) && set.size >= maxSel) {
          return prev;
        } else {
          set.add(opcionId);
        }
      }
      next.set(grupoId, set);
      return next;
    });
  };

  const handleConfirm = () => {
    const v = validarYConstruirSeleccion(grupos, seleccionPorGrupo);
    if (!v.ok) {
      snackbar.error(v.error || "Revisa las opciones.");
      return;
    }
    onConfirm?.(v.opcionesSeleccionadas);
  };

  if (!open || !product) return null;

  const nombre = String(product.nombre ?? product.Nombre ?? "Producto");

  return (
    <BackofficeDialog maxWidthClass="max-w-lg" onBackdropClick={onClose}>
      <div className="w-full min-w-0">
        <h3 className="text-lg font-semibold text-slate-800">Opciones: {nombre}</h3>
        <p className="mt-1 text-xs text-slate-500">Elige una variante antes de agregar a la orden.</p>

        <div className="mt-4 max-h-[min(60vh,420px)] space-y-4 overflow-y-auto pr-1">
          {grupos.map((grupo) => {
            const gid = Number(grupo?.id ?? grupo?.Id);
            const gname = String(grupo?.nombre ?? grupo?.Nombre ?? "Grupo");
            const min = effectiveMinSeleccion(grupo);
            const max = effectiveMaxSeleccion(grupo);
            const rawOpts = grupo?.opciones ?? grupo?.Opciones ?? [];
            const opts = sortOpciones(rawOpts.filter((o) => o?.activo !== false && o?.Activo !== false));
            const sel = seleccionPorGrupo.get(gid) || new Set();

            return (
              <div key={gid} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold text-slate-800">
                  {gname}
                  <span className="ml-1 font-normal text-slate-500">
                    (
                    {min > 0 ? `mín. ${min}` : "opcional"}
                    {Number.isFinite(max) ? ` · máx. ${max}` : " · máx. ilimitado"})
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {opts.map((op) => {
                    const oid = Number(op?.id ?? op?.Id);
                    const oname = String(op?.nombre ?? op?.Nombre ?? "");
                    const add = Number(op?.precioAdicional ?? op?.PrecioAdicional ?? 0);
                    const extra = Number.isFinite(add) && add > 0 ? ` +${formatCurrency(add, currencySymbol)}` : "";
                    const active = sel.has(oid);
                    return (
                      <button
                        key={oid}
                        type="button"
                        onClick={() => toggleOpcion(gid, oid, Number.isFinite(max) ? max : Infinity)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-slate-300 bg-white text-slate-800 hover:border-violet-300"
                        }`}
                      >
                        {oname}
                        {extra ? <span className={active ? "text-violet-100" : "text-emerald-700"}>{extra}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 sm:w-auto"
          >
            Agregar a la orden
          </button>
        </div>
      </div>
    </BackofficeDialog>
  );
}

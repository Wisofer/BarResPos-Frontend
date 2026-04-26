import { useEffect, useState } from "react";
import { Pencil, History, Trash2, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "../../utils/currency.js";
import { getProductImageUrl } from "../../utils/productImage.js";

/**
 * Tarjeta de producto (mismo criterio visual que sistema-de-tienda: imagen, nombre, categoría•código, precio, stock, acciones al hover).
 */
export function ProductCard({ product, currencySymbol, openEdit, openProductHistory, setConfirmAction, readOnly = false }) {
  const p = product;
  const [imgFailed, setImgFailed] = useState(false);
  const stock = Number(p.stock || 0);
  const min = Number(p.stockMinimo || 0);
  const lowStock = Boolean(p.controlarStock) && min > 0 && stock <= min;
  const criticalStock = Boolean(p.controlarStock) && min > 0 && stock <= min * 0.5;
  const img = getProductImageUrl(p);
  const categoriaLabel = p.categoriaNombre || p.categoria || p.Categoria || "Sin categoría";

  useEffect(() => {
    setImgFailed(false);
  }, [p.id, img]);

  return (
    <article
      className={`group relative flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
        p.activo === false ? "opacity-50" : "bg-white"
      }`}
    >
      {lowStock && (
        <div
          className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black tracking-widest shadow-lg ${
            criticalStock ? "animate-pulse bg-red-600 text-white" : "bg-amber-500 text-white"
          }`}
        >
          {criticalStock ? "CRITICO" : "BAJO STOCK"}
        </div>
      )}

      <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-100/50 sm:h-36">
        {img && !imgFailed ? (
          <img
            src={img}
            alt={p.nombre || "Producto"}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-300" />
        )}
      </div>

      <div className="min-w-0 space-y-1">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">{p.nombre || "Producto"}</p>
        <p className="text-[10px] leading-tight text-slate-500">
          <span className="font-semibold uppercase tracking-wide text-slate-500">{categoriaLabel}</span>
          {p.codigo && (
            <>
              <span className="mx-1 text-slate-300">•</span>
              <span className="font-mono text-[10px] font-semibold text-blue-600/80">{p.codigo}</span>
            </>
          )}
        </p>
        {p.talla && (
          <span className="inline-block rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
            T: {p.talla}
          </span>
        )}
      </div>

      <div className="mt-1 border-t border-slate-100 pt-2">
        <p className="text-base font-black tabular-nums text-blue-600">{formatCurrency(p.precioVenta ?? p.precio ?? 0, currencySymbol)}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              lowStock ? (criticalStock ? "text-red-600" : "text-amber-600") : "text-slate-500"
            }`}
          >
            {p.controlarStock ? `Stock: ${stock}` : "Sin control"}
          </p>
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => openEdit(p.id)}
                className="p-1 text-slate-400 transition-colors hover:text-blue-500"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openProductHistory(p)}
                className="p-1 text-slate-400 transition-colors hover:text-indigo-500"
                title="Historial"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    open: true,
                    type: "product",
                    id: p.id,
                    name: p.nombre || "Producto",
                  })
                }
                className="p-1 text-slate-400 transition-colors hover:text-red-500"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

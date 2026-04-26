import { Plus, Trash2, Upload, X } from "lucide-react";
import { BackofficeDialog } from "../BackofficeDialog.jsx";
import { useObjectUrlForFile } from "../../hooks/useObjectUrlForFile.js";
import { getProductImageUrl } from "../../utils/productImage.js";
import { modalFormBodyScrollPlainClass, modalFormFooterClass, modalFormRootClass } from "../../utils/modalResponsiveClasses.js";
import {
  productModalCodigoFieldClass,
  productModalFieldClass,
  productModalTextareaClass,
} from "../../utils/inventoryFormFieldClasses.js";

function categoriaRequiereCocina(c) {
  const v = c?.requiereCocina ?? c?.RequiereCocina;
  return v !== false;
}

const checkboxClass = "h-5 w-5 shrink-0 rounded border-slate-300 sm:h-4 sm:w-4";
const checkboxTopAlignedClass = `mt-0.5 ${checkboxClass}`;
const stockFieldDisabledClass = `${productModalFieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`;

/**
 * Crear / editar producto (misma lógica que en la vista: estado y save en el padre).
 */
export function ProductFormModal({
  saving,
  form,
  setForm,
  onSubmit,
  onRequestClose,
  categories,
  providers,
  imageUploadFile,
  setImageUploadFile,
}) {
  const imageFilePreviewUrl = useObjectUrlForFile(imageUploadFile);
  const existingImageUrl = getProductImageUrl(form);
  const imagePreviewSrc = imageFilePreviewUrl || existingImageUrl;

  return (
    <BackofficeDialog
      maxWidthClass="max-w-2xl"
      panelClassName="sm:mx-auto"
      onBackdropClick={saving ? undefined : onRequestClose}
    >
      <form onSubmit={onSubmit} className={modalFormRootClass}>
        <h3 className="shrink-0 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
          {form.id ? "Editar producto" : "Nuevo producto"}
        </h3>
        <div
          className={`${modalFormBodyScrollPlainClass} grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 sm:items-start sm:gap-x-6 sm:gap-y-3`}
        >
          <label className="min-w-0 block text-xs font-semibold text-slate-600">
            Código
            <input
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              placeholder="Se generará automáticamente si se deja vacío"
              className={`${productModalCodigoFieldClass} ${form.id ? "cursor-not-allowed bg-slate-50 text-slate-600" : ""}`}
              disabled={Boolean(form.id)}
              title={form.id ? "El código no se puede cambiar al editar un producto." : undefined}
              autoComplete="off"
            />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Producto
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del producto"
              className={productModalFieldClass}
              required
              autoComplete="off"
            />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Precio venta
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.precioVenta}
              onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))}
              placeholder="0.00"
              className={productModalFieldClass}
              required
            />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Precio compra
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.precioCompra}
              onChange={(e) => setForm((f) => ({ ...f, precioCompra: e.target.value }))}
              placeholder="0.00"
              className={productModalFieldClass}
            />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Categoría
            <select
              value={form.categoriaProductoId}
              onChange={(e) => setForm((f) => ({ ...f, categoriaProductoId: e.target.value }))}
              className={productModalFieldClass}
              required
            >
              <option value="">Selecciona categoría</option>
              {categories.map((c) => {
                const label = c.nombre || c.descripcion || `Categoria ${c.id}`;
                const cocina = categoriaRequiereCocina(c);
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                    {cocina ? "" : " — solo barra (no cocina)"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">
            Proveedor
            <select
              value={form.proveedorId}
              onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}
              className={productModalFieldClass}
            >
              <option value="">Sin proveedor</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || p.descripcion || `Proveedor ${p.id}`}
                </option>
              ))}
            </select>
          </label>
          {form.controlarStock ? (
            <>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Stock actual
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="Stock"
                  className={stockFieldDisabledClass}
                  disabled={Boolean(form.id)}
                  title={form.id ? "El stock se ajusta solo desde movimientos de inventario." : undefined}
                />
                {form.id && <p className="mt-1 text-[11px] text-slate-500">El stock se ajusta desde Entrada/Salida/Ajuste.</p>}
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">
                Stock mínimo
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.stockMinimo}
                  onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
                  placeholder="0"
                  className={productModalFieldClass}
                />
              </label>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              Inventario desactivado para este producto: no se muestran campos de stock.
            </div>
          )}
          <div className="col-span-full grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:col-span-2">
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 sm:min-h-0">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={form.controlarStock}
                onChange={(e) => setForm((f) => ({ ...f, controlarStock: e.target.checked }))}
              />
              Controlar stock
            </label>
            <label className="flex min-h-[44px] items-start gap-3 text-sm text-slate-700 sm:min-h-0 sm:col-span-2">
              <input
                type="checkbox"
                className={checkboxTopAlignedClass}
                checked={form.esPreparado}
                onChange={(e) => setForm((f) => ({ ...f, esPreparado: e.target.checked }))}
              />
              <span>
                Es preparado (cocina)
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  Si está desmarcado (bebidas embotelladas, reventa), al cancelar un pedido se reintegra el stock cuando
                  controlás inventario.
                </span>
              </span>
            </label>
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-700 sm:min-h-0">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={form.activo}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              />
              Activo
            </label>
          </div>

          <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50/90 p-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Opciones especiales</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.opcionesEspecialesOn}
                aria-label={form.opcionesEspecialesOn ? "Desactivar opciones especiales" : "Activar opciones especiales"}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    opcionesEspecialesOn: !f.opcionesEspecialesOn,
                    opcionesEspecialesLines:
                      !f.opcionesEspecialesOn && (!f.opcionesEspecialesLines?.length || f.opcionesEspecialesLines.length === 0)
                        ? [""]
                        : f.opcionesEspecialesLines,
                  }))
                }
                className={`inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent px-[3px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
                  form.opcionesEspecialesOn ? "justify-end bg-violet-600" : "justify-start bg-slate-300"
                }`}
              >
                <span className="pointer-events-none h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
              </button>
            </div>

            {form.opcionesEspecialesOn && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                {form.opcionesEspecialesLines.map((line, idx) => (
                  <div key={idx} className="flex min-w-0 items-start gap-2">
                    <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
                      Opción {idx + 1}
                      <input
                        value={line}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.opcionesEspecialesLines];
                            next[idx] = e.target.value;
                            return { ...f, opcionesEspecialesLines: next };
                          })
                        }
                        placeholder="Ej. Barbacoa"
                        className={productModalFieldClass}
                        autoComplete="off"
                      />
                    </label>
                    <button
                      type="button"
                      title="Quitar"
                      aria-label="Quitar opción"
                      disabled={form.opcionesEspecialesLines.length <= 1}
                      onClick={() =>
                        setForm((f) => {
                          const next = f.opcionesEspecialesLines.filter((_, j) => j !== idx);
                          return { ...f, opcionesEspecialesLines: next.length ? next : [""] };
                        })
                      }
                      className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, opcionesEspecialesLines: [...f.opcionesEspecialesLines, ""] }))}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 sm:min-h-0 sm:w-auto sm:py-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar otra opción
                </button>
              </div>
            )}
          </div>

          <div className="col-span-full">
            <label className="min-w-0 text-xs font-bold text-slate-600 uppercase tracking-widest">
              Descripción
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Información adicional del producto"
                className={productModalTextareaClass}
                rows={3}
              />
            </label>
          </div>
          <div className="col-span-full mt-2 sm:col-span-2">
            <p className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">Foto del producto (1 imagen)</p>
            {imagePreviewSrc ? (
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={imagePreviewSrc} alt={form.nombre || "Vista previa"} className="h-full w-full object-contain p-2" />
                <button
                  type="button"
                  onClick={() => {
                    setImageUploadFile(null);
                    setForm((f) => ({ ...f, imagenUrl: "" }));
                  }}
                  className="absolute right-2 top-2 rounded-full border border-slate-100 bg-white/95 p-2 text-red-500 shadow-md transition hover:scale-105"
                  title="Quitar imagen"
                  aria-label="Quitar imagen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition-all hover:border-blue-300 hover:bg-blue-50/50">
                <Upload className="h-6 w-6 text-slate-400" />
                <p className="mt-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Seleccionar imagen
                </p>
                <p className="mt-0.5 text-center text-[9px] text-slate-400">JPG, PNG, WEBP — máx. 5MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={false}
                  onChange={(e) => setImageUploadFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {imagePreviewSrc ? "Reemplazar imagen" : "Elegir imagen"}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                multiple={false}
                onChange={(e) => setImageUploadFile(e.target.files?.[0] || null)}
              />
            </label>
            {imageUploadFile ? <p className="mt-1.5 text-[11px] text-slate-500">Archivo: {imageUploadFile.name}</p> : null}
            {!form.esPreparado ? (
              <p className="mt-1.5 text-[11px] text-amber-800">
                Solo se puede subir imagen si &quot;Es preparado (cocina)&quot; está activado.
              </p>
            ) : null}
          </div>
        </div>
        <div className={`${modalFormFooterClass} gap-3`}>
          <button
            type="button"
            onClick={onRequestClose}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 touch-manipulation hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-200 touch-manipulation hover:bg-primary-700 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </BackofficeDialog>
  );
}

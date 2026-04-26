import { Search, Package } from "lucide-react";
import { BackofficeDialog } from "../BackofficeDialog.jsx";
import { getProductImageUrl } from "../../utils/productImage.js";
import { modalFormBodyScrollPlainClass, modalFormRootClass } from "../../utils/modalResponsiveClasses.js";
import { stockModalInputClass, stockModalSelectClass, stockModalTextareaClass } from "../../utils/inventoryFormFieldClasses.js";
import { cn } from "../../../../utils/cn.js";

const SALIDA_MOTIVOS = [
  { value: "Daño", label: "Daño / producto defectuoso" },
  { value: "Merma", label: "Merma" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Ajuste", label: "Ajuste" },
  { value: "Vencimiento", label: "Vencimiento" },
  { value: "Uso interno", label: "Uso interno" },
  { value: "Perdida", label: "Pérdida / robo" },
  { value: "Devolución proveedor", label: "Devolución a proveedor" },
];

/**
 * Entrada, salida y ajuste de stock (UI alineada a sistema-de-tienda; proveedor y factura propios de BarRes).
 */
export function StockMovementModal({
  stockModalOpen,
  setStockModalOpen,
  saving,
  stockModalLoading,
  stockMode,
  submitStockAction,
  stockProductQuery,
  setStockProductQuery,
  stockSuggestOpen,
  setStockSuggestOpen,
  stockSuggestBlurTimerRef,
  stockAutocompleteList,
  selectedStockProduct,
  stockForm,
  setStockForm,
  providers,
  currencySymbol = "C$",
  stockModalProductCount,
}) {
  if (!stockModalOpen) return null;

  const onClose = () => setStockModalOpen(false);
  const title =
    stockMode === "entrada" ? "Entrada de inventario" : stockMode === "salida" ? "Salida de inventario" : "Ajuste de stock";
  const modeKey = (stockMode || "entrada").toUpperCase();

  return (
    <BackofficeDialog
      onBackdropClick={saving || stockModalLoading ? undefined : onClose}
      maxWidthClass="max-w-lg"
      panelClassName="sm:mx-auto"
    >
      <form onSubmit={submitStockAction} className={modalFormRootClass}>
        <h3 className="shrink-0 text-lg font-bold tracking-tight text-slate-800">{title}</h3>
        <p className="mt-0.5 shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{modeKey}</p>
        <p className="mt-1 text-[11px] text-slate-500">Solo productos con &quot;Controlar stock&quot; activo.</p>

        <div className={cn(modalFormBodyScrollPlainClass, "space-y-4")}>
          <div className="relative min-h-[1rem]">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Buscar por nombre o código
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoComplete="off"
                  value={stockProductQuery}
                  onChange={(e) => {
                    setStockProductQuery(e.target.value);
                    setStockForm((f) => ({ ...f, productoId: "" }));
                    setStockSuggestOpen(true);
                  }}
                  onFocus={() => {
                    if (stockSuggestBlurTimerRef.current) {
                      window.clearTimeout(stockSuggestBlurTimerRef.current);
                      stockSuggestBlurTimerRef.current = null;
                    }
                    setStockSuggestOpen(true);
                  }}
                  onBlur={() => {
                    stockSuggestBlurTimerRef.current = window.setTimeout(() => {
                      setStockSuggestOpen(false);
                      stockSuggestBlurTimerRef.current = null;
                    }, 200);
                  }}
                  placeholder="Nombre o código…"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-primary-500 focus:outline-none"
                />
              </div>
              {stockModalLoading && <p className="mt-1.5 text-[11px] text-slate-400">Cargando catálogo…</p>}
            </label>

            {stockSuggestOpen && stockProductQuery.trim().length > 0 && (
              <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
                {stockModalLoading ? (
                  <p className="px-3 py-2 text-sm text-slate-500">Cargando…</p>
                ) : stockAutocompleteList.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</p>
                ) : (
                  <ul>
                    {stockAutocompleteList.map((p) => {
                      const url = getProductImageUrl(p);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setStockForm((f) => ({ ...f, productoId: String(p.id) }));
                              setStockProductQuery(p.nombre || "");
                              setStockSuggestOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {url ? (
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="m-auto h-5 w-5 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-800">{p.nombre}</p>
                              <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                                {(p.codigo || "").trim() ? `Cód. ${String(p.codigo).trim()} · ` : ""}Stock: {p.stock ?? 0}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {!stockModalLoading && stockModalProductCount === 0 && (
            <p className="text-xs font-semibold text-amber-800">No hay productos con control de stock activo en el catálogo.</p>
          )}

          {stockForm.productoId && selectedStockProduct && (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-2 ring-white">
                  {getProductImageUrl(selectedStockProduct) ? (
                    <img
                      src={getProductImageUrl(selectedStockProduct)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900">{selectedStockProduct.nombre}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                    Actual: {selectedStockProduct.stock ?? 0}
                    {selectedStockProduct.codigo ? ` · ${selectedStockProduct.codigo}` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {stockMode === "entrada" && (
            <>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    value={stockForm.cantidad}
                    onChange={(e) => setStockForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className={stockModalInputClass}
                    required
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Costo unitario ({currencySymbol})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.costoUnitario}
                    onChange={(e) => setStockForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                    className={stockModalInputClass}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Proveedor
                  <select
                    value={stockForm.proveedorId}
                    onChange={(e) => setStockForm((f) => ({ ...f, proveedorId: e.target.value }))}
                    className={stockModalSelectClass}
                  >
                    <option value="">Sin proveedor</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre || p.razonSocial || `Proveedor ${p.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Núm. de factura (opcional)
                  <input
                    value={stockForm.numeroFactura}
                    onChange={(e) => setStockForm((f) => ({ ...f, numeroFactura: e.target.value }))}
                    className={stockModalInputClass}
                    placeholder="Factura de compra"
                  />
                </label>
              </div>
            </>
          )}

          {stockMode === "salida" && (
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                Motivo de salida
                <select
                  value={stockForm.subtipo}
                  onChange={(e) => setStockForm((f) => ({ ...f, subtipo: e.target.value }))}
                  className={stockModalSelectClass}
                  required
                >
                  {SALIDA_MOTIVOS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                Cantidad a retirar
                <input
                  type="number"
                  min="1"
                  value={stockForm.cantidad}
                  onChange={(e) => setStockForm((f) => ({ ...f, cantidad: e.target.value }))}
                  className={cn(stockModalInputClass, "text-red-600")}
                  required
                />
              </label>
            </div>
          )}

          {stockMode === "ajuste" && (
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">
              Cantidad física real (nueva)
              <input
                type="number"
                min="0"
                value={stockForm.cantidadNueva}
                onChange={(e) => setStockForm((f) => ({ ...f, cantidadNueva: e.target.value }))}
                className={cn(stockModalInputClass, "text-primary-600")}
                placeholder="Lo que hay en almacén"
                required
              />
            </label>
          )}

          <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">
            Observaciones
            <textarea
              value={stockForm.observaciones}
              onChange={(e) => setStockForm((f) => ({ ...f, observaciones: e.target.value }))}
              className={stockModalTextareaClass}
              rows={2}
              placeholder="Justificá o detallá el movimiento…"
            />
          </label>
        </div>

        <div className="mt-4 flex w-full min-w-0 flex-row flex-wrap gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 sm:min-h-0"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || stockModalLoading}
            className="min-h-[44px] w-full flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 sm:min-h-0"
          >
            {saving ? "Aplicando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </BackofficeDialog>
  );
}

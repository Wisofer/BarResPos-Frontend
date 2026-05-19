import { Loader2 } from "lucide-react";

const DEFAULT_CAPTION = "Procesando…";
const SALE_CAPTION = "Registrando cobro…";
const SUBHINT = "Esperá un momento; no pulses otras acciones.";

function resolveCaption(saleProcessing, detailMessage) {
  if (saleProcessing) return SALE_CAPTION;
  const d = String(detailMessage ?? "").trim();
  return d || DEFAULT_CAPTION;
}

/**
 * Bloquea la UI mientras corre una acción POS (impresión, cocina, sync, cobro).
 * z-index por encima del modal de cobro (z-200).
 *
 * @param {boolean} open
 * @param {boolean} [saleProcessing] — cobro en curso (mensaje fijo de prioridad)
 * @param {string} [detailMessage] — mensaje de la acción actual (impresión, cocina, etc.)
 */
export function PosActionLoadingOverlay({ open, saleProcessing = false, detailMessage = "" }) {
  if (!open) return null;
  const caption = resolveCaption(saleProcessing, detailMessage);
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 text-center shadow-xl">
        <Loader2 className="h-10 w-10 shrink-0 animate-spin text-primary-600" aria-hidden />
        <p className="text-sm font-semibold text-slate-800">{caption}</p>
        <p className="text-xs text-slate-500">{SUBHINT}</p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { KeyRound } from "lucide-react";

/**
 * Modal para cancelar pedidos: solicita PIN global (Configuraciones / PinCancelacionPedidos).
 */
export function CancelPedidoPinModal({
  open,
  onClose,
  title = "Código de autorización",
  message = "Ingresá el PIN para cancelar el pedido.",
  confirmLabel = "Confirmar cancelación",
  loading = false,
  onConfirm,
}) {
  const [codigo, setCodigo] = useState("");
  const [localError, setLocalError] = useState("");

  const handleClose = () => {
    if (loading) return;
    setCodigo("");
    setLocalError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    const trimmed = codigo.trim();
    if (!trimmed) {
      setLocalError("Ingresá el código.");
      return;
    }
    try {
      await onConfirm(trimmed);
      setCodigo("");
      onClose();
    } catch (err) {
      const status = err?.status;
      const msg = err?.message || "No se pudo cancelar.";
      if (status === 403) {
        setLocalError(msg || "Código de verificación inválido.");
      } else if (status === 503) {
        setLocalError(msg || "PIN no configurado en el sistema.");
      } else {
        setLocalError(msg);
      }
    }
  };

  return (
    <Modal open={open} onClose={loading ? () => {} : handleClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <p className="text-center text-sm text-slate-600">{message}</p>
        <label className="block text-xs font-semibold text-slate-700">
          PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest"
            placeholder="••••"
            disabled={loading}
            autoFocus
          />
        </label>
        {localError ? <p className="text-sm font-medium text-red-600">{localError}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading} className="w-full sm:w-auto">
            Volver
          </Button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Cancelando…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

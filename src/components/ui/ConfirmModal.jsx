import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Confirmar",
  message = "¿Está seguro?",
  confirmLabel = "Eliminar",
  variant = "danger",
  loading = false,
}) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const btnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
      : "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500";

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-300 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-slate-700 dark:text-slate-200">{message}</p>
        <div className="flex gap-2 w-full justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${btnClass}`}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

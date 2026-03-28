import { Plus } from "lucide-react";
import { ListSkeleton } from "../components/index.js";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";
import { ProviderFormModal } from "./components/ProviderFormModal.jsx";
import { ProvidersTable } from "./components/ProvidersTable.jsx";
import { useProvidersCatalog } from "./hooks/useProvidersCatalog.js";

export function ProvidersView() {
  const {
    providers,
    loading,
    saving,
    error,
    modalOpen,
    form,
    setForm,
    confirmOpen,
    setConfirmOpen,
    openCreate,
    closeModal,
    openEdit,
    saveProvider,
    removeProvider,
  } = useProvidersCatalog();

  if (loading) {
    return <ListSkeleton rows={8} />;
  }

  return (
    <>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Proveedores usados en productos y en entradas de stock.</p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </button>
        </div>
      </div>

      <div className="mt-4">
        <ProvidersTable
          providers={providers}
          busy={saving}
          onEdit={openEdit}
          onRequestDelete={(id, name) => setConfirmOpen({ open: true, id, name })}
        />
      </div>

      <ProviderFormModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={saveProvider}
        onClose={closeModal}
      />

      <ConfirmModal
        open={confirmOpen.open}
        onClose={() => setConfirmOpen({ open: false, id: null, name: "" })}
        onConfirm={() => confirmOpen.id && removeProvider(confirmOpen.id)}
        title="Desactivar proveedor"
        message={`¿Desactivar "${confirmOpen.name}"?`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </>
  );
}

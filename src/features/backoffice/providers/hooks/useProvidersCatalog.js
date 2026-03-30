import { useCallback, useEffect, useState } from "react";
import { backofficeApi } from "../../services/backofficeApi.js";
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { emptyProviderForm, PROVIDERS_UPDATED_EVENT } from "../constants.js";

function dispatchProvidersUpdated() {
  window.dispatchEvent(new CustomEvent(PROVIDERS_UPDATED_EVENT));
}

export function useProvidersCatalog() {
  const snackbar = useSnackbar();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyProviderForm);
  const [confirmOpen, setConfirmOpen] = useState({ open: false, id: null, name: "" });

  const reload = useCallback(async () => {
    const prov = await backofficeApi.catalogoProveedores();
    setProviders(Array.isArray(prov) ? prov : prov?.items || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await reload();
      } catch (e) {
        if (mounted) setError(e.message || "No se pudo cargar proveedores.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const openCreate = useCallback(() => {
    setForm(emptyProviderForm);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setForm(emptyProviderForm);
  }, []);

  const openEdit = useCallback(
    async (id) => {
      setSaving(true);
      setError("");
      try {
        const p = await backofficeApi.getProveedor(id);
        setForm({
          id: p.id,
          nombre: p.nombre || "",
          telefono: p.telefono || "",
          email: p.email || "",
          direccion: p.direccion || "",
          contacto: p.contacto || "",
          observaciones: p.observaciones || "",
          activo: p.activo !== false,
        });
        setModalOpen(true);
      } catch (e) {
        snackbar.error(e.message || "No se pudo cargar el proveedor.");
      } finally {
        setSaving(false);
      }
    },
    [snackbar]
  );

  const saveProvider = useCallback(
    async (e) => {
      e.preventDefault();
      setSaving(true);
      setError("");
      try {
        const body = {
          nombre: form.nombre,
          telefono: form.telefono || null,
          email: form.email || null,
          direccion: form.direccion || null,
          contacto: form.contacto || null,
          observaciones: form.observaciones || null,
          activo: Boolean(form.activo),
        };
        if (form.id) await backofficeApi.updateProveedor(form.id, body);
        else await backofficeApi.createProveedor(body);
        await reload();
        setForm(emptyProviderForm);
        setModalOpen(false);
        snackbar.success("Proveedor guardado.");
        dispatchProvidersUpdated();
      } catch (e2) {
        snackbar.error(e2.message || "No se pudo guardar proveedor.");
      } finally {
        setSaving(false);
      }
    },
    [form, reload, snackbar]
  );

  const removeProvider = useCallback(
    async (id) => {
      setSaving(true);
      setError("");
      try {
        await backofficeApi.deleteProveedor(id);
        await reload();
        snackbar.success("Proveedor desactivado.");
        dispatchProvidersUpdated();
      } catch (e) {
        snackbar.error(e.message || "No se pudo eliminar proveedor.");
      } finally {
        setSaving(false);
        setConfirmOpen({ open: false, id: null, name: "" });
      }
    },
    [reload, snackbar]
  );

  return {
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
  };
}

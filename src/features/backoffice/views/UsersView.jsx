import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PAGINATION } from "../constants/pagination.js";
import { backofficeApi } from "../services/backofficeApi.js";
import { BackofficeDialog, ListSkeleton } from "../components/index.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { ConfirmModal } from "../../../components/ui/ConfirmModal.jsx";

export function UsersView() {
  const snackbar = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rol, setRol] = useState("");
  const [activo, setActivo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nombreUsuario: "",
    nombreCompleto: "",
    rol: "Mesero",
    contrasena: "",
    activo: true,
  });
  const [confirmDeleteUser, setConfirmDeleteUser] = useState({ open: false, user: null });

  const loadUsers = async ({ currentPage = page, currentSearch = search, currentRol = rol, currentActivo = activo } = {}) => {
    const params = {
      page: currentPage,
      pageSize: PAGINATION.LIST_DEFAULT,
      search: currentSearch || undefined,
      rol: currentRol || undefined,
      activo: currentActivo === "" ? undefined : currentActivo === "true",
    };
    const data = await backofficeApi.listUsuarios(params);
    setUsers(Array.isArray(data?.items) ? data.items : []);
    setTotalPages(data?.totalPages || 1);
    setPage(data?.page || currentPage);
  };

  useEffect(() => {
    let mounted = true;
    loadUsers({ currentPage: 1 })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const openCreate = () => {
    setForm({ id: null, nombreUsuario: "", nombreCompleto: "", rol: "Mesero", contrasena: "", activo: true });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      id: u.id,
      nombreUsuario: u.nombreUsuario || "",
      nombreCompleto: u.nombreCompleto || "",
      rol: u.rol || "Mesero",
      contrasena: "",
      activo: u.activo !== false,
    });
    setModalOpen(true);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        nombreUsuario: form.nombreUsuario.trim(),
        nombreCompleto: form.nombreCompleto.trim(),
        rol: form.rol,
        activo: Boolean(form.activo),
      };
      if (form.contrasena) body.contrasena = form.contrasena;
      if (form.id) await backofficeApi.updateUsuario(form.id, body);
      else await backofficeApi.createUsuario({ ...body, contrasena: form.contrasena });
      await loadUsers();
      setModalOpen(false);
      snackbar.success(form.id ? "Usuario actualizado." : "Usuario creado.");
    } catch (err) {
      snackbar.error(err.message || "No se pudo guardar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (u) => {
    setSaving(true);
    setError("");
    try {
      await backofficeApi.deleteUsuario(u.id);
      await loadUsers();
      snackbar.success("Usuario eliminado.");
    } catch (err) {
      snackbar.error(err.message || "No se pudo eliminar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      await loadUsers({ currentPage: 1 });
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (nextPage) => {
    setLoading(true);
    try {
      await loadUsers({ currentPage: nextPage });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ListSkeleton rows={6} />;
  return (
    <>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Usuarios</h2>
          <button onClick={openCreate} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuario" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={rol} onChange={(e) => setRol(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos los roles</option>
            <option value="Administrador">Administrador</option>
            <option value="Mesero">Mesero</option>
            <option value="Cajero">Cajero</option>
            <option value="Cocinero">Cocinero</option>
            <option value="Bartender">Bartender</option>
          </select>
          <select value={activo} onChange={(e) => setActivo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <button onClick={applyFilters} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Filtrar
          </button>
        </div>
        <div className="space-y-3">
          {users.length === 0 && <p className="text-sm text-slate-500">No hay usuarios.</p>}
          {users.map((u, i) => (
            <article
              key={u.id || i}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{u.nombreUsuario || u.nombre || "Usuario"}</p>
                <p className="text-xs text-slate-500">Nombre: {u.nombreCompleto || "-"} | Rol: {u.rol || "N/D"} | Estado: {u.activo === false ? "Inactivo" : "Activo"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-600">
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
                <button onClick={() => setConfirmDeleteUser({ open: true, user: u })} className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600">
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Anterior</button>
          <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Siguiente</button>
        </div>
      </div>
      {modalOpen && (
        <BackofficeDialog maxWidthClass="max-w-md" onBackdropClick={saving ? undefined : () => setModalOpen(false)}>
          <form onSubmit={saveUser} className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-slate-800">{form.id ? "Editar usuario" : "Nuevo usuario"}</h3>
            <div className="mt-4 space-y-3">
              <input value={form.nombreUsuario} onChange={(e) => setForm((f) => ({ ...f, nombreUsuario: e.target.value }))} placeholder="Nombre de usuario" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={form.nombreCompleto} onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))} placeholder="Nombre completo" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                <option value="Administrador">Administrador</option>
                <option value="Mesero">Mesero</option>
                <option value="Cajero">Cajero</option>
                <option value="Cocinero">Cocinero</option>
                <option value="Bartender">Bartender</option>
              </select>
              <input
                type="password"
                value={form.contrasena}
                onChange={(e) => setForm((f) => ({ ...f, contrasena: e.target.value }))}
                placeholder={form.id ? "Nueva contraseña (opcional)" : "Contraseña"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required={!form.id}
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
                Activo
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto">Cancelar</button>
              <button disabled={saving} className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </BackofficeDialog>
      )}
      <ConfirmModal
        open={confirmDeleteUser.open}
        onClose={() => setConfirmDeleteUser({ open: false, user: null })}
        onConfirm={async () => {
          if (confirmDeleteUser.user) await removeUser(confirmDeleteUser.user);
        }}
        title="Eliminar usuario"
        message={confirmDeleteUser.user ? `¿Eliminar usuario "${confirmDeleteUser.user.nombreUsuario}"?` : "¿Eliminar usuario?"}
        confirmLabel="Eliminar"
        variant="danger"
        loading={saving}
      />
    </>
  );
}

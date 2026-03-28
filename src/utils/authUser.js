/**
 * Unifica la forma del usuario que devuelve el API (.NET suele usar PascalCase;
 * el login puede anidar user en distintas propiedades).
 */
export function normalizeAuthUser(payload) {
  if (payload == null || typeof payload !== "object") return null;

  const inner =
    payload.user ??
    payload.User ??
    payload.usuario ??
    payload.Usuario ??
    payload.data ??
    payload.Data;

  const u =
    inner && typeof inner === "object" && !inner.accessToken && !inner.AccessToken
      ? inner
      : payload;

  if (!u || typeof u !== "object") return null;

  const id = u.id ?? u.Id;
  const nombreUsuario = u.nombreUsuario ?? u.NombreUsuario ?? u.usuario ?? u.Usuario ?? u.userName ?? u.UserName;
  const nombreCompleto = u.nombreCompleto ?? u.NombreCompleto ?? u.nombre ?? u.Nombre ?? u.fullName ?? u.FullName;
  const email = u.email ?? u.Email ?? u.correo ?? u.Correo ?? u.mail ?? u.Mail;
  const rol =
    u.rol ??
    u.Rol ??
    u.role ??
    u.Role ??
    u.nombreRol ??
    u.NombreRol ??
    u.perfil ??
    u.Perfil;

  if (id == null && nombreUsuario == null && nombreCompleto == null) return null;

  const name = String(nombreUsuario || nombreCompleto || "Usuario").trim() || "Usuario";

  return {
    id,
    nombreUsuario: nombreUsuario != null ? String(nombreUsuario) : name,
    nombreCompleto: nombreCompleto != null ? String(nombreCompleto) : null,
    email: email != null ? String(email) : null,
    rol: rol != null ? String(rol) : null,
  };
}

export function displayUserName(user) {
  if (!user) return "Usuario";
  const nc = user.nombreCompleto ?? user.NombreCompleto;
  const nu = user.nombreUsuario ?? user.NombreUsuario;
  if (nc && String(nc).trim()) return String(nc).trim();
  if (nu && String(nu).trim()) return String(nu).trim();
  return "Usuario";
}

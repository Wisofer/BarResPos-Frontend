export function getUserRoleText(user) {
  if (!user || typeof user !== "object") return "";
  return String(
    user.rol ??
      user.Rol ??
      user.role ??
      user.Role ??
      user.nombreRol ??
      user.NombreRol ??
      user.perfil ??
      user.Perfil ??
      ""
  )
    .trim()
    .toLowerCase();
}

export function isAdminUser(user) {
  const role = getUserRoleText(user);
  return role.includes("admin") || role.includes("administrador");
}

export function isMeseroUser(user) {
  const role = getUserRoleText(user);
  return role.includes("mesero") || role.includes("waiter");
}

export function getAllowedViewIds(user) {
  if (isAdminUser(user)) {
    return ["dashboard", "orders", "tables", "products", "kitchen", "cashier", "users", "settings", "reports"];
  }
  if (isMeseroUser(user)) {
    return ["dashboard", "tables", "orders"];
  }
  return ["dashboard", "tables"];
}

export function canAccessView(user, viewId) {
  return getAllowedViewIds(user).includes(viewId);
}

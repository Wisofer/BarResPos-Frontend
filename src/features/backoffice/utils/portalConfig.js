/**
 * Texto opcional del portal desde GET /api/v1/configuraciones.
 * Claves aceptadas (clave insensible a mayúsculas / espacios): portal_tagline, subtitulo_vista, tagline.
 */
export function pickPortalTagline(configs) {
  const list = Array.isArray(configs) ? configs : configs?.items || [];
  const keysWanted = new Set(["portal_tagline", "subtitulo_vista", "subtitulovista", "tagline", "portal_subtitle"]);
  for (const c of list) {
    const raw = c?.clave ?? c?.Clave ?? "";
    const key = String(raw)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!keysWanted.has(key)) continue;
    const v = c?.valor ?? c?.Valor;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

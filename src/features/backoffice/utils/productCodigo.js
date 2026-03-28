/** Fragmento legible a partir del nombre (mayúsculas, sin acentos). */
export function slugFromNombre(nombre) {
  const s = String(nombre || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  if (!s) return "";
  return s.length > 28 ? s.slice(0, 28) : s;
}

function codigosSet(existingCodigos) {
  return new Set(
    existingCodigos.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean)
  );
}

/** Evita colisiones con otros productos (comparación case-insensitive). */
export function ensureUniqueProductCodigo(base, existingCodigos) {
  const used = codigosSet(existingCodigos);
  let out = String(base || "").trim();
  if (!out) return out;
  let i = 0;
  while (used.has(out.toLowerCase())) {
    i += 1;
    out = `${base}-${i}`;
  }
  return out;
}

/**
 * Código final al guardar: respeta el que escribió el usuario; si está vacío, genera uno
 * (prefijo desde nombre + sufijo, o SKU-… si no hay nombre).
 */
export function resolveProductCodigoForSave(rawCodigo, nombre, existingCodigos = []) {
  let base = String(rawCodigo || "").trim();
  if (!base) {
    const frag = slugFromNombre(nombre);
    const tail = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    base = frag ? `${frag}-${tail.slice(-8)}` : `SKU-${tail.slice(-10)}`;
  }
  return ensureUniqueProductCodigo(base, existingCodigos);
}

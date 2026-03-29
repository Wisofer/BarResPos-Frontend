/** Normaliza lista de pares grupo/opción para comparar líneas de carrito. */
export function opcionesSeleccionadasKey(ops) {
  const list = Array.isArray(ops) ? ops : [];
  if (list.length === 0) return "";
  return [...list]
    .map((o) => `${Number(o.grupoId ?? o.GrupoId)}:${Number(o.opcionId ?? o.OpcionId)}`)
    .sort()
    .join("|");
}

export function normalizeOpcionesGrupos(product) {
  const raw = product?.opcionesGrupos ?? product?.OpcionesGrupos ?? [];
  return Array.isArray(raw) ? raw : [];
}

export function productoTieneOpcionesVisibles(product) {
  const grupos = normalizeOpcionesGrupos(product);
  return grupos.some((g) => {
    const opts = g?.opciones ?? g?.Opciones ?? [];
    return opts.some((o) => o?.activo !== false && o?.Activo !== false);
  });
}

/**
 * Grupos con al menos una opción activa (mismo criterio que catálogo visible).
 */
export function gruposConOpcionesActivas(product) {
  return normalizeOpcionesGrupos(product).filter((g) => {
    const opts = g?.opciones ?? g?.Opciones ?? [];
    return opts.some((o) => o?.activo !== false && o?.Activo !== false);
  });
}

/**
 * Para POS inline: solo si hay exactamente un grupo con opciones activas.
 * Si hay varios grupos, el front debe usar modal u otro flujo.
 */
export function getSingleGrupoOpcionesForPosInline(product) {
  const grupos = gruposConOpcionesActivas(product);
  if (grupos.length !== 1) return null;
  const g = grupos[0];
  const gid = Number(g?.id ?? g?.Id);
  if (!Number.isFinite(gid)) return null;
  const rawOpts = g?.opciones ?? g?.Opciones ?? [];
  const opciones = [...rawOpts]
    .filter((o) => o?.activo !== false && o?.Activo !== false)
    .sort((a, b) => Number(a?.orden ?? a?.Orden ?? 0) - Number(b?.orden ?? b?.Orden ?? 0));
  return { grupo: g, grupoId: gid, opciones };
}

export function effectiveMinSeleccion(grupo) {
  const obl = Boolean(grupo?.obligatorio ?? grupo?.Obligatorio);
  const min = Number(grupo?.minSeleccion ?? grupo?.MinSeleccion ?? 0);
  if (obl && min === 0) return 1;
  return Number.isFinite(min) && min >= 0 ? min : 0;
}

export function effectiveMaxSeleccion(grupo) {
  const max = Number(grupo?.maxSeleccion ?? grupo?.MaxSeleccion ?? 0);
  if (max === 0) return Infinity;
  return Number.isFinite(max) && max > 0 ? max : Infinity;
}

export function normalizeOpcionesSeleccionadas(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((o) => ({
      grupoId: Number(o?.grupoId ?? o?.GrupoId),
      opcionId: Number(o?.opcionId ?? o?.OpcionId),
    }))
    .filter((o) => Number.isFinite(o.grupoId) && Number.isFinite(o.opcionId));
}

/** Copia del renglón API con `opcionesSeleccionadas` solo si hay pares válidos (entrada cruda). */
export function withOpcionesSeleccionadas(row, rawOpciones) {
  const o = normalizeOpcionesSeleccionadas(rawOpciones);
  if (o.length === 0) return row;
  return { ...row, opcionesSeleccionadas: o };
}

/** Igual que arriba pero el array ya está normalizado (evita doble normalización). */
export function withOpcionesNormalizadas(row, opcionesNorm) {
  const list = Array.isArray(opcionesNorm) ? opcionesNorm : [];
  if (list.length === 0) return row;
  return { ...row, opcionesSeleccionadas: list };
}

/** Misma clave = misma línea para sumar cantidad (producto + opciones + notas). */
export function posLineMergeKey(opcionesSeleccionadas, notas) {
  const o = normalizeOpcionesSeleccionadas(opcionesSeleccionadas);
  const k = opcionesSeleccionadasKey(o);
  const n = String(notas ?? "").trim();
  return `${k}\u001e${n}`;
}

/** Suma precioAdicional de las opciones elegidas según grupos del catálogo. */
export function sumarPrecioAdicionalOpciones(grupos, seleccion) {
  const pairs = normalizeOpcionesSeleccionadas(seleccion);
  let sum = 0;
  for (const { grupoId, opcionId } of pairs) {
    const g = grupos.find((x) => Number(x?.id ?? x?.Id) === grupoId);
    if (!g) continue;
    const opts = g?.opciones ?? g?.Opciones ?? [];
    const op = opts.find((x) => Number(x?.id ?? x?.Id) === opcionId);
    if (!op) continue;
    const add = Number(op?.precioAdicional ?? op?.PrecioAdicional ?? 0);
    if (Number.isFinite(add)) sum += add;
  }
  return sum;
}

/**
 * seleccionPorGrupo: Map<number, Set<number>> grupoId -> opcionIds
 * Returns { ok, error?, opcionesSeleccionadas }
 */
export function validarYConstruirSeleccion(grupos, seleccionPorGrupo) {
  const opcionesSeleccionadas = [];
  for (const grupo of grupos) {
    const gid = Number(grupo?.id ?? grupo?.Id);
    if (!Number.isFinite(gid)) continue;
    const opts = grupo?.opciones ?? grupo?.Opciones ?? [];
    const activas = opts.filter((o) => o?.activo !== false && o?.Activo !== false);
    if (activas.length === 0) continue;

    const set = seleccionPorGrupo.get(gid) || new Set();
    const elegidas = [...set].filter((oid) => activas.some((o) => Number(o?.id ?? o?.Id) === oid));
    const n = elegidas.length;
    const min = effectiveMinSeleccion(grupo);
    const max = effectiveMaxSeleccion(grupo);

    if (n < min) {
      const nombre = String(grupo?.nombre ?? grupo?.Nombre ?? "Opciones");
      return { ok: false, error: `Elige al menos ${min} en «${nombre}».`, opcionesSeleccionadas: [] };
    }
    if (Number.isFinite(max) && n > max) {
      const nombre = String(grupo?.nombre ?? grupo?.Nombre ?? "Opciones");
      return { ok: false, error: `Máximo ${max} en «${nombre}».`, opcionesSeleccionadas: [] };
    }
    for (const opcionId of elegidas) {
      opcionesSeleccionadas.push({ grupoId: gid, opcionId });
    }
  }
  return { ok: true, error: "", opcionesSeleccionadas };
}

/** Quita prefijo «Nombre del grupo: » de cada segmento (p. ej. API o datos viejos). */
export function opcionesResumenSoloTextoOpcion(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s
    .split(" · ")
    .map((seg) => {
      const i = seg.indexOf(": ");
      if (i === -1) return seg.trim();
      return seg.slice(i + 2).trim();
    })
    .filter(Boolean)
    .join(" · ");
}

/** Solo nombres de opción en pantalla (sin «Opciones especiales: …»). */
export function buildOpcionesResumenLocal(grupos, opcionesSeleccionadas) {
  const pairs = normalizeOpcionesSeleccionadas(opcionesSeleccionadas);
  if (pairs.length === 0) return "";
  const parts = [];
  for (const { grupoId, opcionId } of pairs) {
    const g = grupos.find((x) => Number(x?.id ?? x?.Id) === grupoId);
    const opts = g?.opciones ?? g?.Opciones ?? [];
    const op = opts.find((x) => Number(x?.id ?? x?.Id) === opcionId);
    const on = String(op?.nombre ?? op?.Nombre ?? "").trim();
    if (on) parts.push(on);
  }
  return parts.join(" · ");
}

export function genPosLineId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

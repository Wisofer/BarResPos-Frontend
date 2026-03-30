const STORAGE_KEY = "barrest-mesas-plano-positions-v1";

const CELL_W = 132;
const CELL_H = 92;
const COLS = 6;

/** Tamaño base de la tarjeta en el plano (px), coincide con el layout visual */
export const MESA_PLANO_BASE_W = 110;
export const MESA_PLANO_BASE_H = 102;

export const MESA_PLANO_SCALE_MIN = 0.55;
export const MESA_PLANO_SCALE_MAX = 1.75;

/** Escala guardada por mesa (1 = tamaño por defecto) */
export function clampPlanoMesaScale(s) {
  if (!Number.isFinite(s)) return 1;
  return Math.min(MESA_PLANO_SCALE_MAX, Math.max(MESA_PLANO_SCALE_MIN, s));
}

export function readMesaPlanoPositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    if (typeof p !== "object" || !p || Array.isArray(p)) return {};
    return p;
  } catch {
    return {};
  }
}

export function writeMesaPlanoPositions(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function defaultSlot(index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { x: 10 + col * CELL_W, y: 10 + row * CELL_H };
}

/**
 * Mantiene posiciones guardadas, asigna casillas por defecto a mesas nuevas y elimina ids que ya no existen.
 */
export function buildPlanoPositionsWithDefaults(tables, previous) {
  const ids = new Set(tables.map((t) => String(t.id)));
  const out = {};
  for (const id of ids) {
    const prev = previous[id];
    if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
      out[id] = { x: prev.x, y: prev.y, s: clampPlanoMesaScale(prev.s) };
    }
  }
  tables.forEach((t, i) => {
    const id = String(t.id);
    if (!out[id]) out[id] = { ...defaultSlot(i), s: 1 };
  });
  return out;
}

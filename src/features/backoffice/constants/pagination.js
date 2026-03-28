/**
 * Tamaños de página usados en llamadas a la API (un solo lugar para el front).
 * El servidor sigue siendo la fuente de verdad para totales y validación.
 */
export const PAGINATION = {
  LIST_DEFAULT: 20,
  LIST_LARGE: 100,
  POS_PRODUCTOS: 200,
  /** Catálogo amplio para alertas de stock en shell (AuthHome). */
  CATALOG_ALERTS: 500,
  /** Listado paginado en administración de productos. */
  PRODUCTOS_ADMIN: 120,
  MOVIMIENTOS: 200,
};

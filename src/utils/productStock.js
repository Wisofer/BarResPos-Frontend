/**
 * Indica si el producto tiene stock bajo (API: stock_bajo, o stock <= stock_minimo).
 * Backend: stock_bajo es true cuando stock <= stock_minimo (incluye igualdad).
 */
export function isProductStockBajo(product) {
  if (product == null) return false;
  if (typeof product.stock_bajo === "boolean") return product.stock_bajo;
  if (typeof product.stockBajo === "boolean") return product.stockBajo;
  const min = Number(product.stock_minimo ?? product.stockMinimo) || 0;
  const stock = Number(product.stock ?? 0);
  return min > 0 && stock <= min;
}

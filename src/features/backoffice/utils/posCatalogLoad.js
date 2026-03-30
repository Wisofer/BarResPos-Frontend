/**
 * Catálogo POS con opciones (productos activos + categorías).
 * @param {object} api — típicamente `backofficeApi`
 * @param {number} pageSize — ej. `PAGINATION.POS_PRODUCTOS`
 */
export async function fetchPosProductosYCategorias(api, pageSize) {
  const [productsData, categoriesData] = await Promise.all([
    api.listProductos({
      page: 1,
      pageSize,
      activos: true,
      incluirOpciones: true,
    }),
    api.catalogoCategoriasProducto(),
  ]);
  const products = Array.isArray(productsData?.items) ? productsData.items : [];
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.items || [];
  return { products, categories };
}

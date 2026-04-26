/** URL de imagen de producto (formulario o API, varias formas posibles). */
export function getProductImageUrl(productOrForm) {
  return (
    productOrForm?.imagenUrl ??
    productOrForm?.ImagenUrl ??
    productOrForm?.imageUrl ??
    productOrForm?.ImageUrl ??
    productOrForm?.imagen ??
    productOrForm?.Imagen ??
    ""
  );
}

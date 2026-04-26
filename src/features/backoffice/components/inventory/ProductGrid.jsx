import { ProductCard } from "./ProductCard.jsx";

/**
 * Cuadrícula de productos (densidad alineada con sistema-de-tienda).
 */
export function ProductGrid({
  products,
  currencySymbol,
  openEdit,
  openProductHistory,
  setConfirmAction,
  gridColumns = 5,
  readOnly = false,
}) {
  if (products.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200">
        <p className="text-sm text-slate-500">No hay productos disponibles.</p>
      </div>
    );
  }

  const gridColsClass = {
    3: "lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3",
    4: "lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4",
    5: "lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5",
    6: "lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6",
  }[gridColumns] || "lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5";

  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${gridColsClass}`}>
      {products.map((p, i) => (
        <ProductCard
          key={p.id || i}
          product={p}
          currencySymbol={currencySymbol}
          openEdit={openEdit}
          openProductHistory={openProductHistory}
          setConfirmAction={setConfirmAction}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

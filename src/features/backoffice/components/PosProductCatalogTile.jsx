import { getProductImageUrl } from "../utils/productImage.js";

/**
 * Tarjeta de producto en catálogo POS (mesas / delivery): foto a pantalla o gradiente clásico a lo diagonal.
 */
export function PosProductCatalogTile({ product, onClick, disabled }) {
  const url = getProductImageUrl(product);
  const name = String(product?.nombre ?? product?.Nombre ?? "Producto");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative min-h-[96px] w-full overflow-hidden rounded-lg border border-slate-200/90 text-left text-white shadow transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 enabled:hover:-translate-y-0.5 enabled:hover:border-sky-400/40 enabled:hover:shadow-md enabled:hover:shadow-slate-300/20 enabled:active:scale-[0.99] enabled:active:brightness-[0.99] motion-reduce:transition-none motion-reduce:enabled:hover:translate-y-0 sm:min-h-[104px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow"
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-100 motion-reduce:group-hover:scale-100"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-500 transition duration-200 group-hover:brightness-105 group-active:brightness-95 motion-reduce:group-hover:brightness-100"
          aria-hidden
        />
      )}
      <div
        className={
          url
            ? "relative z-10 flex h-full min-h-[96px] w-full flex-col justify-end px-2.5 py-2.5 sm:min-h-[104px] [&_span]:text-white [&_span]:[text-shadow:0_0_1px_rgba(255,255,255,0.5),0_0_10px_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.18),0_0_8px_rgba(0,0,0,0.1)]"
            : "relative z-10 flex h-full min-h-[96px] w-full flex-col items-start justify-end px-2.5 py-2.5 text-left sm:min-h-[104px]"
        }
      >
        <span
          className={
            url
              ? "line-clamp-3 w-full break-words text-left text-[11px] font-bold leading-tight tracking-wide sm:text-xs"
              : "line-clamp-3 w-full break-words text-left text-[10px] font-bold leading-tight tracking-wide [text-shadow:0_0_6px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.08),0_0_1px_rgba(255,255,255,0.4)] sm:text-[11px]"
          }
        >
          {name.toUpperCase()}
        </span>
      </div>
    </button>
  );
}

import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

/**
 * Rutas de tickets HTML bajo API REST (ya no MVC):
 * GET /api/v1/impresion/recibo/{pagoId}, /comanda/{ordenId}, /cocina/{ordenId}
 * Legacy: /impresion/... → se normaliza a /api/v1/impresion/...
 *
 * En navegación directa (iframe src / window.open) no va Authorization; el backend
 * acepta el mismo JWT en query: ?access_token=...
 */
function normalizeImpresionPathname(pathname) {
  if (!pathname || typeof pathname !== "string") return pathname;
  if (pathname.includes("/api/v1/impresion/")) return pathname;
  if (pathname.startsWith("/impresion/")) {
    return `/api/v1${pathname}`;
  }
  return pathname;
}

function isImpressionPathname(pathname) {
  if (!pathname) return false;
  return pathname.includes("/api/v1/impresion/") || pathname.startsWith("/impresion/");
}

/** Resuelve URL del API (ruta relativa o absoluta). Normaliza URLs de impresión al prefijo /api/v1/impresion/. */
export function resolveBackendAssetUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http")) {
    try {
      const u = new URL(url);
      const next = normalizeImpresionPathname(u.pathname);
      if (next !== u.pathname) u.pathname = next;
      return u.toString();
    } catch {
      return url;
    }
  }
  let path = url.startsWith("/") ? url : `/${url}`;
  path = normalizeImpresionPathname(path);
  return `${getApiUrl()}${path}`;
}

/** Añade access_token para rutas de impresión (iframe / window.open / fetch). */
export function withImpressionAccessTokenQuery(absoluteUrl) {
  if (!absoluteUrl || typeof absoluteUrl !== "string") return absoluteUrl;
  const token = getToken();
  if (!token) return absoluteUrl;
  try {
    const base = absoluteUrl.startsWith("http") ? undefined : getApiUrl();
    const u = new URL(absoluteUrl, base);
    if (!isImpressionPathname(u.pathname)) return absoluteUrl;
    u.searchParams.set("access_token", token);
    return u.toString();
  } catch {
    return absoluteUrl;
  }
}

/**
 * Imprime un blob en un iframe oculto (evita bloqueo de popups en muchos navegadores).
 * @returns {Promise<boolean>}
 */
export function printBlobInHiddenFrame(blob, options = {}) {
  const { shouldPrint = true } = options;
  return new Promise((resolve) => {
    try {
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = blobUrl;
      let didPrint = false;
      let didResolve = false;
      const safeResolve = (val) => {
        if (didResolve) return;
        didResolve = true;
        resolve(val);
      };

      iframe.onload = () => {
        try {
          if (shouldPrint) {
            if (didPrint) return;
            didPrint = true;
            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } finally {
                setTimeout(() => {
                  URL.revokeObjectURL(blobUrl);
                  iframe.remove();
                  safeResolve(true);
                }, 1500);
              }
            }, 150);
          } else {
            // Deja que el HTML (si ya trae window.print() automático) haga su trabajo.
            setTimeout(() => {
              try {
                URL.revokeObjectURL(blobUrl);
                iframe.remove();
              } finally {
                safeResolve(true);
              }
            }, 1500);
          }
        } catch {
          URL.revokeObjectURL(blobUrl);
          iframe.remove();
          safeResolve(false);
        }
      };
      iframe.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        iframe.remove();
        safeResolve(false);
      };
      document.body.appendChild(iframe);
    } catch {
      resolve(false);
    }
  });
}

/** GET con Bearer, descarga blob e intenta imprimir. */
export async function openBackendPrintUrl(url) {
  if (!url) return false;
  const token = getToken();
  const resolved = resolveBackendAssetUrl(url);
  const fetchUrl = withImpressionAccessTokenQuery(resolved);
  if (!fetchUrl) return false;
  try {
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const looksLikeHtml = ct.includes("text/html") || ct.includes("application/xhtml+xml");
    // Si es HTML, normalmente ya dispara window.print() en el backend; evitar doble diálogo.
    return await printBlobInHiddenFrame(blob, { shouldPrint: !looksLikeHtml });
  } catch {
    return false;
  }
}

/** Imprime HTML como documento temporal. */
export async function openBackendPrintHtml(html) {
  if (!html || typeof html !== "string") return false;
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    // Para HTML evitamos el `print()` desde el frontend para prevenir el doble diálogo
    // (el backend suele disparar window.print() al cargar el documento).
    return await printBlobInHiddenFrame(blob, { shouldPrint: false });
  } catch {
    return false;
  }
}

// Nota: antes existía `openAuthenticatedBackendBlobInNewTab`, pero ya no se usa
// (los flujos de impresión usan iframe oculto con `printBlobInHiddenFrame`).

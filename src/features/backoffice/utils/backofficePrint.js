import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

const KITCHEN_PRINT_AUTO_FAIL_INFO =
  "No se pudo abrir la impresión automática. Podés reintentar o imprimir desde el detalle del pedido.";

/** Mensaje común tras imprimir pre-cuenta vía backend (URL/HTML). */
export const PRECUENTA_PRINT_READY_INFO = "Pre-cuenta lista para imprimir.";

const FE_COCINA_TICKET_LOGO_MARKER = "data-barrest-cocina-logo";

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Logo del SPA (public/) en URL absoluta para `<img>` dentro de HTML de impresión (blob). */
export function getBundledTicketLogoAbsoluteUrl() {
  if (typeof window === "undefined") return "";
  try {
    const baseUrl = window.location.origin + (import.meta.env.BASE_URL || "/");
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL("assets/images/nandofood.png", base).href;
  } catch {
    return "";
  }
}

/**
 * Si el HTML de cocina no trae logo (backend sin `Tickets:LogoUrl`), añade el del SPA una sola vez.
 * No duplica si ya inyectamos o si el ticket ya referencia el mismo asset.
 */
export function injectCocinaTicketLogoIfMissing(html) {
  if (typeof html !== "string" || !html.trim()) return html;
  if (html.includes(FE_COCINA_TICKET_LOGO_MARKER)) return html;
  if (/\bnandofood\.png\b/i.test(html)) return html;
  const logo = getBundledTicketLogoAbsoluteUrl();
  if (!logo) return html;
  const safeSrc = escapeHtmlAttr(logo);
  const block = `<div ${FE_COCINA_TICKET_LOGO_MARKER}="1" style="text-align:center;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb"><img src="${safeSrc}" alt="" style="max-width:120px;max-height:44px;object-fit:contain" /></div>`;
  const bodyOpen = /<body([^>]*)>/i;
  if (bodyOpen.test(html)) {
    return html.replace(bodyOpen, `<body$1>${block}`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${block}${html}</body></html>`;
}

function contentTypeLooksLikeHtml(contentTypeHeader) {
  const s = (contentTypeHeader || "").toLowerCase();
  return s.includes("text/html") || s.includes("application/xhtml+xml");
}

/**
 * Tras fetch a `/impresion/...`: cocina fuerza print() en el iframe; otros HTML suelen traer print() en el documento (evitar doble diálogo).
 */
function shouldForceIframePrintAfterImpressionFetch(looksLikeHtml, cocinaLogo) {
  return cocinaLogo ? true : !looksLikeHtml;
}

/**
 * @param {Response} res
 * @param {boolean} cocinaLogo
 * @returns {Promise<{ blob: Blob; shouldPrint: boolean }>}
 */
async function buildImpressionBlobForPrint(res, cocinaLogo) {
  const ct = res.headers.get("content-type") || "";
  const looksLikeHtml = contentTypeLooksLikeHtml(ct);
  let blob;
  if (cocinaLogo && looksLikeHtml) {
    const text = await res.text();
    blob = new Blob([injectCocinaTicketLogoIfMissing(text)], { type: "text/html;charset=utf-8" });
  } else {
    blob = await res.blob();
  }
  const shouldPrint = shouldForceIframePrintAfterImpressionFetch(looksLikeHtml, cocinaLogo);
  return { blob, shouldPrint };
}

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

/**
 * GET con Bearer, descarga e intenta imprimir.
 * @param {string} url
 * @param {{ cocinaLogo?: boolean }} [options] — si `cocinaLogo`, inyecta logo del SPA en HTML de cocina cuando falta.
 */
export async function openBackendPrintUrl(url, options = {}) {
  const { cocinaLogo = false } = options;
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
    const { blob, shouldPrint } = await buildImpressionBlobForPrint(res, cocinaLogo);
    return await printBlobInHiddenFrame(blob, { shouldPrint });
  } catch {
    return false;
  }
}

/** URL del ticket HTML de cocina devuelta por PATCH `.../enviar-cocina`. */
export function extractUrlImpresionCocina(data) {
  if (!data || typeof data !== "object") return "";
  const u = data.urlImpresionCocina ?? data.UrlImpresionCocina ?? "";
  return String(u || "").trim();
}

/**
 * Tras enviar a cocina (200 + data): imprime ticket si el backend envió URL (logo incluido si faltaba en el HTML).
 * @param {object} data — `data` del envelope API
 * @param {{ info?: (msg: string) => void }} [snackbar] — si falla la impresión automática y hubo URL, muestra aviso
 */
export async function printKitchenTicketAfterEnviarCocina(data, snackbar) {
  const url = extractUrlImpresionCocina(data);
  if (!url) return false;
  const printed = await openBackendPrintUrl(url, { cocinaLogo: true });
  if (!printed && typeof snackbar?.info === "function") {
    snackbar.info(KITCHEN_PRINT_AUTO_FAIL_INFO);
  }
  return printed;
}

/** Extrae URL de impresión desde respuesta típica de precuenta (mesa o delivery). */
export function extractPrecuentaUrlFromPayload(pre) {
  if (!pre || typeof pre !== "object") return "";
  const u =
    pre.urlImpresionPrecuenta ??
    pre.UrlImpresionPrecuenta ??
    pre.urlImpresion ??
    pre.UrlImpresion ??
    "";
  return String(u || "").trim();
}

export function extractPrecuentaHtmlFromPayload(pre) {
  if (!pre || typeof pre !== "object") return "";
  const h = pre.htmlPrecuenta ?? pre.HtmlPrecuenta;
  return typeof h === "string" ? h : h != null ? String(h) : "";
}

/** Intenta imprimir desde objeto precuenta: URL primero, luego HTML embebido. */
export async function tryPrintPrecuentaFromPayload(pre) {
  const url = extractPrecuentaUrlFromPayload(pre);
  if (url && (await openBackendPrintUrl(url))) return true;
  const html = extractPrecuentaHtmlFromPayload(pre);
  if (html && (await openBackendPrintHtml(html))) return true;
  return false;
}

/** Normaliza respuesta de endpoint *PrecuentaHtml* (string o `{ html }`). */
export function unwrapHtmlBodyField(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  const h = raw?.html ?? raw?.Html;
  return typeof h === "string" ? h : "";
}

export async function tryPrintHtmlBody(raw) {
  const html = unwrapHtmlBodyField(raw);
  if (html && (await openBackendPrintHtml(html))) return true;
  return false;
}

export function extractReciboHtmlFromPagoResponse(resp) {
  if (!resp || typeof resp !== "object") return "";
  const h =
    resp.htmlImpresionRecibo ??
    resp.HtmlImpresionRecibo ??
    resp.htmlPrecuenta ??
    resp.HtmlPrecuenta ??
    null;
  return typeof h === "string" ? h : "";
}

export function extractReciboUrlFromPagoResponse(resp) {
  if (!resp || typeof resp !== "object") return "";
  return String(resp.urlImpresionRecibo ?? resp.UrlImpresionRecibo ?? resp.url ?? resp.Url ?? "").trim();
}

/** Tras cobro: prioriza HTML de recibo en cuerpo, luego URL (misma regla que POS / delivery). */
export async function tryPrintReciboFromPagoResponse(resp) {
  const html = extractReciboHtmlFromPagoResponse(resp);
  if (html && (await openBackendPrintHtml(html))) return true;
  const url = extractReciboUrlFromPagoResponse(resp);
  if (url && (await openBackendPrintUrl(url))) return true;
  return false;
}

export function pagoResponseHasReciboPrintChannel(resp) {
  return !!(extractReciboHtmlFromPagoResponse(resp) || extractReciboUrlFromPagoResponse(resp));
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

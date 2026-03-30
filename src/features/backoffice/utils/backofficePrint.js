import { getApiUrl } from "../../../api/config.js";
import { getToken } from "../../../api/token.js";

/** Resuelve URL del API (ruta relativa o absoluta). */
export function resolveBackendAssetUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${getApiUrl()}${path}`;
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
  if (!resolved) return false;
  try {
    const res = await fetch(resolved, {
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

/**
 * Abre documento backend en nueva pestaña: fetch autenticado + blob, o URL directa si falla.
 */
export async function openAuthenticatedBackendBlobInNewTab(url) {
  if (!url) return;
  const resolved = resolveBackendAssetUrl(url);
  const token = getToken();
  try {
    const res = await fetch(resolved, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } else {
      window.open(resolved, "_blank", "noopener,noreferrer");
    }
  } catch {
    window.open(resolved, "_blank", "noopener,noreferrer");
  }
}

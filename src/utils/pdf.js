import { getToken } from "../api/token.js";

function normalizePdfUrl(pdfUrl) {
  if (!pdfUrl) return pdfUrl;
  // Fuerza https cuando la app está en https para evitar mixed-content/redirecciones.
  if (window.location.protocol === "https:" && pdfUrl.startsWith("http://")) {
    return pdfUrl.replace(/^http:\/\//i, "https://");
  }
  return pdfUrl;
}

/**
 * Abre un PDF ya descargado como Blob: impresión directa (TripPilot) o solo vista.
 * Útil cuando el PDF viene de `invoicesApi.getPdf(id)` u otro endpoint que devuelve Blob.
 *
 * @param {Blob} blob
 * @param {{ print?: boolean; filename?: string }} [options]
 * @returns {{ ok: boolean; reason?: string; fallback?: string }}
 */
export function openPdfBlob(blob, options = {}) {
  const { print = true, filename = "documento.pdf" } = options;
  const safeName = String(filename).replace(/[^\w.\-]/g, "_") || "documento.pdf";
  const blobUrl = URL.createObjectURL(blob);

  if (!print) {
    const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      URL.revokeObjectURL(blobUrl);
      return { ok: false, reason: "popup_blocked" };
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return { ok: true };
  }

  const w = window.open(blobUrl, "_blank");
  if (!w) {
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return { ok: true, fallback: "download" };
    } catch (_) {
      URL.revokeObjectURL(blobUrl);
      return { ok: false, reason: "popup_blocked" };
    }
  }

  const tryPrint = () => {
    try {
      w.print();
      w.onafterprint = () => {
        try {
          w.close();
        } catch (_) {}
      };
    } catch (_) {}
  };
  w.onload = tryPrint;
  setTimeout(tryPrint, 800);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  return { ok: true };
}

/**
 * Abre un PDF privado usando Bearer token (fetch + blob).
 * Evita 401 por abrir URL protegida directamente y problemas de mixed content.
 *
 * @param {string} pdfUrl
 * @param {{ print?: boolean; filename?: string }} [options]
 *   - `print: true` (default): mismo flujo que TripPilot — ventana nueva + `print()` + `onafterprint` + cerrar.
 *   - `print: false`: solo abre el PDF en una pestaña (vista).
 */
export async function openProtectedPdf(pdfUrl, options = {}) {
  if (!pdfUrl) {
    return { ok: false, reason: "missing_url" };
  }
  const normalizedUrl = normalizePdfUrl(pdfUrl);
  try {
    const token = getToken();
    const res = await fetch(normalizedUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return { ok: false, reason: "http_error", status: res.status };
    }
    const blob = await res.blob();
    return openPdfBlob(blob, options);
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

/** Alias semántico: ticket/factura PDF con diálogo de impresión. */
export function printProtectedPdf(pdfUrl, options = {}) {
  return openProtectedPdf(pdfUrl, { ...options, print: true });
}

export function getPdfOpenErrorMessage(result, fallback = "No se pudo abrir el PDF.") {
  if (!result || result.ok) return "";
  if (result.reason === "popup_blocked") return "Permite ventanas emergentes para abrir el PDF.";
  if (result.reason === "missing_url") return "No hay PDF disponible.";
  if (result.reason === "http_error" && result.status === 401) return "Sesión expirada o no autorizada para abrir este PDF.";
  if (result.reason === "http_error") return `No se pudo abrir el PDF (HTTP ${result.status}).`;
  if (result.reason === "network_error") return "Error de red al abrir el PDF.";
  return fallback;
}

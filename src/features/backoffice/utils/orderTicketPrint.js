import { backofficeApi } from "../services/backofficeApi.js";
import { openBackendPrintHtml, openBackendPrintUrl } from "./backofficePrint.js";
import { formatCurrency } from "./currency.js";
import { pedidoSubtotalConsumoCordobas, pedidoDescuentoCobroCordobas, pedidoTotalNetoCobradoCordobas } from "./pedidoCobro.js";
import { escapeHtml, formatDateTimeLabel } from "./ordersViewFormatters.js";

/**
 * Imprime pre-cuenta: intenta URL/HTML del backend; si no, ventana con HTML generado.
 */
export async function printOrderTicket({ order, currencySymbol, snackbar }) {
  const orderId = order?.id ?? order?.Id ?? null;
  if (orderId) {
    try {
      const pre = await backofficeApi.pedidoPrecuenta(orderId);
      const urlPrecuenta =
        pre?.urlImpresionPrecuenta ?? pre?.UrlImpresionPrecuenta ?? pre?.urlImpresion ?? pre?.UrlImpresion ?? null;
      const htmlPrecuenta = pre?.htmlPrecuenta ?? pre?.HtmlPrecuenta ?? null;

      if (urlPrecuenta) {
        const opened = await openBackendPrintUrl(urlPrecuenta);
        if (opened) {
          snackbar?.info("Pre-cuenta lista para imprimir.");
          return;
        }
      }
      if (htmlPrecuenta) {
        const openedHtml = await openBackendPrintHtml(htmlPrecuenta);
        if (openedHtml) {
          snackbar?.info("Pre-cuenta lista para imprimir.");
          return;
        }
      }
      const htmlDirect = await backofficeApi.pedidoPrecuentaHtml(orderId).catch(() => null);
      const directValue = typeof htmlDirect === "string" ? htmlDirect : htmlDirect?.html ?? htmlDirect?.Html ?? null;
      if (directValue) {
        const openedDirect = await openBackendPrintHtml(directValue);
        if (openedDirect) {
          snackbar?.info("Pre-cuenta lista para imprimir.");
          return;
        }
      }
    } catch {
      // reserva local abajo
    }
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const sumLines = items.reduce((acc, it) => acc + Number(it.monto || 0), 0);
  const subConsumoPrint = pedidoSubtotalConsumoCordobas(order) || sumLines;
  const descPrint = pedidoDescuentoCobroCordobas(order);
  const netoPrint = pedidoTotalNetoCobradoCordobas(order);
  const rows = items
    .map((it) => {
      const producto = it.servicio || "-";
      const cantidad = Number(it.cantidad || 0);
      const unit = Number(it.precioUnitario || 0);
      const subtotal = Number(it.monto || 0);
      const notas = it.notas || "-";
      return `<tr>
          <td>${escapeHtml(producto)}</td>
          <td style="text-align:center">${escapeHtml(String(cantidad))}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(unit, currencySymbol))}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(subtotal, currencySymbol))}</td>
          <td>${escapeHtml(notas)}</td>
        </tr>`;
    })
    .join("");

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    snackbar?.error("Permite ventanas emergentes para imprimir.");
    return;
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Ticket ${escapeHtml(order.numero || `#${order.id}`)}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;padding:16px;color:#111;max-width:820px;margin:0 auto}
      h1{font-size:18px;margin:0 0 4px}
      .meta{font-size:12px;color:#555;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:6px 4px;border-bottom:1px solid #e5e7eb}
      th{text-align:left;background:#f8fafc}
      .totals{margin-top:12px;text-align:right;font-size:13px;line-height:1.5}
      .totals .strong{font-weight:700}
    </style>
  </head>
  <body>
    <h1>Ticket de pedido</h1>
    <div class="meta">
      <div>Pedido: ${escapeHtml(order.numero || `#${order.id}`)}</div>
      <div>Mesa: ${escapeHtml(order.mesa || "-")}</div>
      <div>Mesero: ${escapeHtml(order.mesero || "-")}</div>
      <div>Fecha: ${escapeHtml(formatDateTimeLabel(order.fechaCreacion))}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>P/U</th>
          <th>Subtotal</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>${
        rows || '<tr><td colspan="5" style="text-align:center;color:#666">Sin productos</td></tr>'
      }</tbody>
    </table>
    <div class="totals">
      <div>Subtotal consumo: <span class="strong">${escapeHtml(formatCurrency(subConsumoPrint, currencySymbol))}</span></div>
      ${
        descPrint > 0.0001
          ? `<div>Descuento (cobro): −${escapeHtml(formatCurrency(descPrint, currencySymbol))}</div>`
          : ""
      }
      ${
        netoPrint != null && Number.isFinite(netoPrint)
          ? `<div>Total pagado (neto): <span class="strong">${escapeHtml(formatCurrency(netoPrint, currencySymbol))}</span></div>`
          : `<div>Total: <span class="strong">${escapeHtml(formatCurrency(subConsumoPrint, currencySymbol))}</span></div>`
      }
    </div>
  </body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      snackbar?.error("No se pudo abrir el diálogo de impresión.");
    }
  }, 180);
}

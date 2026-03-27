/**
 * Reemplaza variables en el mensaje de plantilla WhatsApp para facturas.
 * Variables: {NombreCliente}, {CodigoCliente}, {NumeroFactura}, {Monto}, {Mes}, {Categoria}, {Estado}, {FechaCreacion}, {EnlacePDF}
 */
export function buildInvoiceWhatsAppMessage(templateMessage, { invoice, clientName, clientId, pdfUrl }) {
  if (!templateMessage || typeof templateMessage !== "string") return "";
  const d = invoice?.date ? new Date(invoice.date) : null;
  const mes = d ? d.toLocaleDateString("es-NI", { month: "long" }) : "";
  const fechaCreacion = d ? d.toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
  const monto = invoice?.amount != null ? Number(invoice.amount).toLocaleString("es-NI", { minimumFractionDigits: 2 }) : "";

  return templateMessage
    .replace(/\{NombreCliente\}/g, clientName ?? "Cliente")
    .replace(/\{CodigoCliente\}/g, clientId != null ? String(clientId) : "")
    .replace(/\{NumeroFactura\}/g, invoice?.id != null ? String(invoice.id) : "")
    .replace(/\{Monto\}/g, monto)
    .replace(/\{Mes\}/g, mes)
    .replace(/\{Categoria\}/g, invoice?.concept ?? "")
    .replace(/\{Estado\}/g, invoice?.status ?? "")
    .replace(/\{FechaCreacion\}/g, fechaCreacion)
    .replace(/\{EnlacePDF\}/g, pdfUrl ?? "");
}

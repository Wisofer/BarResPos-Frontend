/**
 * Exporta datos a CSV (abrir en Excel).
 * @param {Array<Record<string, unknown>>} rows - Filas de datos
 * @param {Array<{ key: string, label: string }>} columns - Columnas { key, label }
 * @param {string} filename - Nombre del archivo sin extensión
 */
export function exportToCSV(rows, columns, filename = "export") {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headerRow = columns.map((c) => escape(c.label)).join(",");
  const dataRows = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta una tabla a PDF abriendo el diálogo de imprimir (Guardar como PDF).
 * @param {string} title - Título del reporte
 * @param {string[]} headers - Encabezados de columnas
 * @param {Array<string[]>} rows - Filas (array de cadenas por celda)
 */
export function exportToPDF(title, headers, rows) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const ths = headers
    .map((h) => `<th style="border:1px solid #ccc;padding:6px;text-align:left;background:#f1f5f9;">${h}</th>`)
    .join("");
  const trs = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td style="border:1px solid #ccc;padding:6px;">${c}</td>`).join("")}</tr>`
    )
    .join("");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${title}</title></head>
    <body style="font-family:system-ui;padding:20px;">
    <h1 style="margin-bottom:16px;">${title}</h1>
    <p style="color:#64748b;margin-bottom:16px;">Generado: ${new Date().toLocaleString("es-NI")}</p>
    <table style="width:100%;border-collapse:collapse;">
    <thead><tr>${ths}</tr></thead>
    <tbody>${trs}</tbody>
    </table>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

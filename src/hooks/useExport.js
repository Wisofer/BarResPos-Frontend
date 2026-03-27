import { useState, useCallback } from "react";
import { downloadExport } from "../api/export";
import { useSnackbar } from "../contexts/SnackbarContext";

/**
 * Hook reutilizable para exportar Excel/PDF desde listados.
 * @param {string} basePath - Ej: "/api/clients", "/api/sales"
 * @param {() => Record<string, unknown>} getParams - Función que devuelve los query params actuales
 * @param {string} excelFilename - Ej: "Clientes.xlsx"
 * @param {string} pdfFilename - Ej: "Clientes.pdf"
 */
export function useExport(basePath, getParams, excelFilename, pdfFilename) {
  const snackbar = useSnackbar();
  const [exportLoading, setExportLoading] = useState({ excel: false, pdf: false });

  const handleExportExcel = useCallback(async () => {
    setExportLoading((s) => ({ ...s, excel: true }));
    try {
      await downloadExport(basePath, "excel", getParams() || {}, excelFilename);
      snackbar.success("Descarga iniciada");
    } catch (err) {
      snackbar.error(err?.message || "Error al exportar Excel");
    } finally {
      setExportLoading((s) => ({ ...s, excel: false }));
    }
  }, [basePath, excelFilename, snackbar]);

  const handleExportPdf = useCallback(async () => {
    setExportLoading((s) => ({ ...s, pdf: true }));
    try {
      await downloadExport(basePath, "pdf", getParams() || {}, pdfFilename);
      snackbar.success("Descarga iniciada");
    } catch (err) {
      snackbar.error(err?.message || "Error al exportar PDF");
    } finally {
      setExportLoading((s) => ({ ...s, pdf: false }));
    }
  }, [basePath, pdfFilename, snackbar]);

  return { exportLoading, handleExportExcel, handleExportPdf };
}

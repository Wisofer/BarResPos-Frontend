import { Modal } from "../../../../components/ui/Modal.jsx";
import { formatCurrency } from "../../utils/currency.js";
import { tableHorizontalScrollClass } from "../../utils/modalResponsiveClasses.js";
import { reporteFilaMontoDesgloseProducto, reporteFilaNombreCategoria, reporteFilaNombreProductoDesglose } from "../../utils/reportUtils.js";

export function CategoriaProductosModal({ open, onClose, loading, categoria, productos = [] }) {
  const title = categoria
    ? `Productos: ${reporteFilaNombreCategoria(categoria)}`
    : "Productos por categoría";
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {loading ? (
        <p className="text-sm text-slate-500">Cargando productos...</p>
      ) : (
        <div className={tableHorizontalScrollClass}>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cantidad</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {productos.length ? (
                productos.map((x, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{reporteFilaNombreProductoDesglose(x)}</td>
                    <td className="px-3 py-2">{x.cantidad ?? x.Cantidad ?? 0}</td>
                    <td className="px-3 py-2 font-medium">{formatCurrency(reporteFilaMontoDesgloseProducto(x))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                    Sin datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

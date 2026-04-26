import { Eye } from "lucide-react";
import { formatCurrency } from "../../utils/currency.js";
import { formatDateTime } from "../../utils/reportDates.js";
import { tableHorizontalScrollClass } from "../../utils/modalResponsiveClasses.js";
import {
  cierreFechaRaw,
  cierreHistorialDiferencia,
  cierreHistorialMontoInicial,
  cierreHistorialMontoEsperado,
  cierreHistorialMontoReal,
  cierreHistorialTotalVentas,
  cierreId,
} from "../../utils/caja.js";

function EmptyRow({ colSpan, loading }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-slate-500">
        {loading ? "Cargando…" : "Sin resultados."}
      </td>
    </tr>
  );
}

export function ReportTables({
  activeReport,
  loading,
  reportData,
  ventasRows,
  productosTopRows,
  meserosRows,
  categoriasRows,
  movimientosRows,
  onOpenVentaDetail,
  onOpenCategoriaProductos,
  currencySymbol = "C$",
}) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-500">Cargando reporte…</p>;
  }

  if (activeReport === "ventas") {
    return (
      <div className={tableHorizontalScrollClass}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Moneda</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasRows.length ? (
              ventasRows.map((x, idx) => (
                <tr key={`${x.id}-${idx}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">{formatDateTime(x.fecha)}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{x.numero || "—"}</td>
                  <td className="px-3 py-2">{x.estado || "—"}</td>
                  <td className="px-3 py-2">{x.metodoPago || "—"}</td>
                  <td className="px-3 py-2">{x.moneda || "—"}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(x.totalCobrado ?? x.total ?? 0)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenVentaDetail(x.id ?? x.Id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary-700 hover:bg-primary-50"
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7} />
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "productos-top") {
    return (
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
            {productosTopRows.length ? (
              productosTopRows.map((x, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2">{x.producto || x.nombre || "—"}</td>
                  <td className="px-3 py-2">{x.cantidad ?? x.unidades ?? 0}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(x.total ?? x.venta ?? 0)}</td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={3} />
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "meseros") {
    return (
      <div className={tableHorizontalScrollClass}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mesero</th>
              <th className="px-3 py-2">Ventas</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {meserosRows.length ? (
              meserosRows.map((x, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2">{x.mesero || x.vendedor || x.usuario || "—"}</td>
                  <td className="px-3 py-2">{x.cantidadOrdenes ?? x.CantidadOrdenes ?? x.cantidadVentas ?? x.ordenes ?? 0}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(x.totalNeto ?? x.TotalNeto ?? x.total ?? x.monto ?? 0)}</td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={3} />
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "categorias") {
    return (
      <div className={tableHorizontalScrollClass}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categoriasRows.length ? (
              categoriasRows.map((x, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2">{x.categoria || "—"}</td>
                  <td className="px-3 py-2">{x.cantidad ?? 0}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(x.total ?? 0)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenCategoriaProductos(x)}
                      className="text-xs text-primary-700 hover:underline"
                    >
                      Ver productos
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4} />
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "caja") {
    const rows = reportData.cajaHistorial || [];
    return (
      <>
        <h4 className="mb-4 text-base font-bold uppercase tracking-tight text-slate-800">Historial de Caja</h4>
        <div className={tableHorizontalScrollClass}>
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Cierre</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3 text-right">Apertura</th>
                <th className="px-3 py-3 text-right">Ventas</th>
                <th className="px-3 py-3 text-right">Esperado</th>
                <th className="px-3 py-3 text-right">Contado</th>
                <th className="px-3 py-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, idx) => {
                  const diff = cierreHistorialDiferencia(row);
                  const real = cierreHistorialMontoReal(row);
                  const diffClass =
                    diff == null
                      ? "text-slate-500"
                      : diff < 0
                        ? "text-red-600"
                        : diff > 0
                          ? "text-emerald-700"
                          : "text-slate-700";
                  return (
                    <tr key={cierreId(row) ?? idx} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold text-slate-400">#{cierreId(row) ?? "—"}</td>
                      <td className="px-3 py-2 text-[11px] font-bold uppercase text-slate-500">
                        {String(cierreFechaRaw(row) || "—").slice(0, 10)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600">
                          {row.estado || row.Estado || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">
                        {formatCurrency(cierreHistorialMontoInicial(row), currencySymbol)}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-blue-600">
                        {formatCurrency(cierreHistorialTotalVentas(row), currencySymbol)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                        {formatCurrency(cierreHistorialMontoEsperado(row), currencySymbol)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">
                        {real == null ? "—" : formatCurrency(real, currencySymbol)}
                      </td>
                      <td className={`px-3 py-2 text-right font-black tabular-nums ${diffClass}`}>
                        {diff == null ? "—" : formatCurrency(diff, currencySymbol)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <EmptyRow colSpan={8} />
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className={tableHorizontalScrollClass}>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Producto</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {movimientosRows.length ? (
            movimientosRows.map((x, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-3 py-2">{formatDateTime(x.fecha)}</td>
                <td className="px-3 py-2">{x.productoNombre || "—"}</td>
                <td className="px-3 py-2">{x.tipo || "—"}</td>
                <td className="px-3 py-2">{x.cantidad ?? 0}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={4} />
          )}
        </tbody>
      </table>
    </div>
  );
}

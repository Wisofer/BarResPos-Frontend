import { BackofficeListSkeletonLoading, BackofficePageShell, CancelPedidoPinModal } from "../components/index.js";
import { useOrdersManagement } from "../hooks/useOrdersManagement.js";
import { OrdersKpiGrid } from "../components/orders/OrdersKpiGrid.jsx";
import { OrdersListHeader } from "../components/orders/OrdersListHeader.jsx";
import { OrdersFilterPanel } from "../components/orders/OrdersFilterPanel.jsx";
import { OrdersListTable } from "../components/orders/OrdersListTable.jsx";
import { OrdersPaginationBar } from "../components/orders/OrdersPaginationBar.jsx";
import { OrderDetailPanel } from "../components/orders/OrderDetailPanel.jsx";

export function OrdersView({ currencySymbol = "C$" }) {
  const om = useOrdersManagement(currencySymbol);

  if (om.showDetail && om.detailOrder) {
    return (
      <BackofficePageShell maxWidth="7xl" className="space-y-4 pb-8">
        <OrderDetailPanel
          error={om.error}
          detailOrder={om.detailOrder}
          showEdit={om.showEdit}
          setShowEdit={om.setShowEdit}
          isAdmin={om.isAdmin}
          busyAction={om.busyAction}
          currencySymbol={currencySymbol}
          onBack={om.backFromDetail}
          onPrint={om.printDetail}
          onStartEdit={() => om.openEdit(om.detailOrder)}
          editForm={om.editForm}
          setEditForm={om.setEditForm}
          onSubmitEdit={om.saveEdit}
        />
        {om.confirmCancel.open && (
          <CancelPedidoPinModal
            open
            onClose={() => om.setConfirmCancel({ open: false, order: null })}
            loading={om.busyAction}
            title="Cancelar pedido"
            message={
              om.confirmCancel.order
                ? `Pedido ${om.confirmCancel.order.id}. Ingresá el PIN de autorización.`
                : "Ingresá el PIN de autorización."
            }
            confirmLabel="Cancelar pedido"
            onConfirm={om.onCancelPedidoConfirm}
          />
        )}
      </BackofficePageShell>
    );
  }

  if (om.loading && !om.listHasLoadedOnce) {
    return <BackofficeListSkeletonLoading rows={6} maxWidth="7xl" />;
  }

  const listBusy = om.loading && om.listHasLoadedOnce;

  return (
    <BackofficePageShell maxWidth="7xl" className={`space-y-4 pb-8 transition-opacity ${listBusy ? "pointer-events-none opacity-60" : ""}`} aria-busy={listBusy || undefined}>
      {om.error && (
        <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-2.5 text-sm text-red-800" role="alert">
          {om.error}
        </div>
      )}

      <div className="space-y-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <OrdersListHeader onExport={om.handleExport} exporting={om.exporting} />
        <OrdersKpiGrid cards={om.cards} currencySymbol={currencySymbol} />
        <div className="h-px bg-slate-100" aria-hidden />
        <OrdersFilterPanel
          filters={om.filters}
          setFilters={om.setFilters}
          searchTerm={om.searchTerm}
          setSearchTerm={om.setSearchTerm}
          applyQuickStatus={om.applyQuickStatus}
          applyTipoFilter={om.applyTipoFilter}
          showEmptyDrafts={om.showEmptyDrafts}
          setShowEmptyDrafts={om.setShowEmptyDrafts}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-0">
          <OrdersListTable
            rows={om.filteredOrders}
            isAdmin={om.isAdmin}
            busyAction={om.busyAction}
            onView={om.openDetail}
            onEdit={om.openEditFromRow}
            onCancel={om.cancelOrder}
          />
        </div>
        <div className="border-t border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <OrdersPaginationBar page={om.page} setPage={om.setPage} pageInfo={om.pageInfo} disabled={om.loading} />
        </div>
      </div>

      {om.confirmCancel.open && (
        <CancelPedidoPinModal
          open
          onClose={() => om.setConfirmCancel({ open: false, order: null })}
          loading={om.busyAction}
          title="Cancelar pedido"
          message={
            om.confirmCancel.order
              ? `Pedido ${om.confirmCancel.order.id}. Ingresá el PIN de autorización.`
              : "Ingresá el PIN de autorización."
          }
          confirmLabel="Cancelar pedido"
          onConfirm={om.onCancelPedidoConfirm}
        />
      )}
    </BackofficePageShell>
  );
}

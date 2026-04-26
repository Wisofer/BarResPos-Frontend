import { useCallback, useEffect, useMemo, useState } from "react";
import { backofficeApi } from "../services/backofficeApi.js";
import { PAGINATION } from "../constants/pagination.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { isAdminUser } from "../utils/auth.js";
import { printOrderTicket } from "../utils/orderTicketPrint.js";
import { mapListadoPedidoToRow, mapResumenToCards } from "../utils/ordersViewMappers.js";

function isEmptyDraftOrder(order) {
  const isGuardado = String(order?.status || "").toLowerCase() === "guardado";
  const total = Number(order?.total || 0);
  const productsCount = Number(order?.productsCount || 0);
  return isGuardado && total <= 0 && productsCount <= 0;
}

export function useOrdersManagement(currencySymbol) {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const isAdmin = isAdminUser(user);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState({
    totalPedidos: 0,
    pagados: 0,
    pendientes: 0,
    montoTotal: 0,
    montoTotalCobradoNeto: null,
    descuentoTotalCordobas: 0,
    pedidosPorTipo: { mesa: 0, delivery: 0 },
  });
  const [page, setPage] = useState(1);
  const [dataNonce, setDataNonce] = useState(0);
  /** Tras el primer load exitoso, el listado no se sustituye por skeleton en cada recarga. */
  const [listHasLoadedOnce, setListHasLoadedOnce] = useState(false);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalItems: 0 });
  const [detailOrder, setDetailOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState({ open: false, order: null });
  const [editForm, setEditForm] = useState({
    mesaId: "",
    clienteId: "",
    meseroId: "",
    estado: "",
    estadoCocina: "",
    observaciones: "",
    items: [],
  });
  const [filters, setFilters] = useState({
    estado: "",
    desde: "",
    hasta: "",
    tipo: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmptyDrafts, setShowEmptyDrafts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const filterParams = {
          estado: filters.estado || undefined,
          desde: filters.desde?.trim() || undefined,
          hasta: filters.hasta?.trim() || undefined,
          tipo: filters.tipo || undefined,
        };
        const [resumen, listado] = await Promise.all([
          backofficeApi.pedidosResumen(filterParams),
          backofficeApi.listPedidos({ ...filterParams, page, pageSize: PAGINATION.LIST_DEFAULT }),
        ]);
        if (cancelled) return;
        const items = listado?.items || [];
        const mapped = items.map((p, i) => mapListadoPedidoToRow(p, i, currencySymbol));
        const visibleRows = showEmptyDrafts ? mapped : mapped.filter((row) => !isEmptyDraftOrder(row));
        const hiddenCount = mapped.length - visibleRows.length;
        const apiTotalItems = Number(listado?.totalItems || mapped.length);
        setCards(mapResumenToCards(resumen));
        setOrders(visibleRows);
        setPageInfo({
          totalPages: Number(listado?.totalPages || 1),
          totalItems: Math.max(0, apiTotalItems - Math.max(0, hiddenCount)),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "No se pudo cargar la vista de pedidos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setListHasLoadedOnce(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, filters.desde, filters.estado, filters.hasta, filters.tipo, currencySymbol, dataNonce, showEmptyDrafts]);

  const refreshList = useCallback(() => {
    setDataNonce((n) => n + 1);
  }, []);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const text =
        `${order.id} ${order.numero || ""} ${order.table} ${order.clienteNombre || ""} ${order.waiter} ${order.mesaId || ""} ${order.meseroId || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [orders, searchTerm]);

  const applyQuickStatus = (estado) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, estado }));
  };

  const applyTipoFilter = (tipo) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, tipo }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ estado: "", desde: "", hasta: "", tipo: "" });
  };

  const applyServerFilters = () => {
    setPage(1);
    setDataNonce((n) => n + 1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const blob = await backofficeApi.exportPedidosExcel({
        ...(filters.estado ? { estado: filters.estado } : {}),
        ...(filters.desde ? { desde: filters.desde.trim() } : {}),
        ...(filters.hasta ? { hasta: filters.hasta.trim() } : {}),
        ...(filters.tipo ? { tipo: filters.tipo } : {}),
      });
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(fileUrl);
      snackbar.success("Excel de pedidos descargado correctamente.");
    } catch (err) {
      setError(err.message || "Error exportando pedidos.");
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (order) => {
    setBusyAction(true);
    setError("");
    try {
      const detail = await backofficeApi.getPedido(order.rowId);
      setDetailOrder(detail);
      setShowDetail(true);
      setShowEdit(false);
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle del pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const openEdit = (detail) => {
    setEditForm({
      mesaId: detail?.mesaId ?? "",
      clienteId: detail?.clienteId ?? "",
      meseroId: detail?.meseroId ?? "",
      estado: detail?.estado || "",
      estadoCocina: detail?.estadoCocina || "",
      observaciones: detail?.observaciones || "",
      items: (detail?.items || []).map((it) => ({
        id: it.id,
        servicioId: it.servicioId,
        servicio: it.servicio || "Producto",
        cantidad: String(it.cantidad ?? 1),
        precioUnitario: String(it.precioUnitario ?? 0),
        estado: it.estado || "",
        notas: it.notas || "",
      })),
    });
    setShowEdit(true);
  };

  const openEditFromRow = async (order) => {
    setBusyAction(true);
    setError("");
    try {
      const detail = await backofficeApi.getPedido(order.rowId);
      setDetailOrder(detail);
      openEdit(detail);
      setShowDetail(true);
    } catch (err) {
      setError(err.message || "No se pudo abrir edicion del pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!detailOrder?.id) return;
    setBusyAction(true);
    setError("");
    try {
      const items = editForm.items.map((it) => ({
        servicioId: Number(it.servicioId),
        cantidad: Number(it.cantidad),
        precioUnitario: it.precioUnitario === "" ? null : Number(it.precioUnitario),
        estado: it.estado || null,
        notas: it.notas || null,
      }));
      await backofficeApi.updatePedido(detailOrder.id, {
        mesaId: editForm.mesaId === "" ? null : Number(editForm.mesaId),
        clienteId: editForm.clienteId === "" ? null : Number(editForm.clienteId),
        meseroId: editForm.meseroId === "" ? null : Number(editForm.meseroId),
        estado: editForm.estado || null,
        estadoCocina: editForm.estadoCocina || null,
        observaciones: editForm.observaciones || null,
        items,
      });
      const refreshed = await backofficeApi.getPedido(detailOrder.id);
      setDetailOrder(refreshed);
      setShowEdit(false);
      snackbar.success("Pedido actualizado correctamente.");
      refreshList();
    } catch (err) {
      snackbar.error(err.message || "No se pudo editar el pedido.");
    } finally {
      setBusyAction(false);
    }
  };

  const printDetail = () => {
    if (!detailOrder) return;
    void printOrderTicket({ order: detailOrder, currencySymbol, snackbar });
  };

  const cancelOrder = (order) => {
    setConfirmCancel({ open: true, order });
  };

  const backFromDetail = () => {
    setShowDetail(false);
    setShowEdit(false);
  };

  const onCancelPedidoConfirm = async (codigo) => {
    const order = confirmCancel.order;
    if (!order) throw new Error("Pedido no seleccionado.");
    setBusyAction(true);
    try {
      await backofficeApi.pedidoCancelar(order.rowId, codigo);
      snackbar.success("Pedido cancelado.");
      refreshList();
      if (showDetail && detailOrder?.id === order.rowId) {
        try {
          const r = await backofficeApi.getPedido(order.rowId);
          setDetailOrder(r);
        } catch {
          setShowDetail(false);
        }
      }
    } finally {
      setBusyAction(false);
    }
  };

  return {
    isAdmin,
    loading,
    listHasLoadedOnce,
    error,
    cards,
    filteredOrders,
    page,
    setPage,
    pageInfo,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    showEmptyDrafts,
    setShowEmptyDrafts,
    exporting,
    busyAction,
    detailOrder,
    showDetail,
    showEdit,
    setShowEdit,
    editForm,
    setEditForm,
    confirmCancel,
    setConfirmCancel,
    onCancelPedidoConfirm,
    refreshList,
    applyQuickStatus,
    applyTipoFilter,
    clearFilters,
    handleExport,
    openDetail,
    openEditFromRow,
    openEdit,
    saveEdit,
    cancelOrder,
    printDetail,
    backFromDetail,
    applyServerFilters,
  };
}

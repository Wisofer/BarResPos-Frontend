import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChefHat, RefreshCw, Send } from "lucide-react";
import { backofficeApi } from "../services/backofficeApi.js";
import { ListSkeleton } from "../components/index.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

const KDS_SECTIONS = [
  { key: "por_preparar", label: "Por preparar", states: ["Pendiente", "En Preparación"] },
  { key: "listo", label: "Listo para entregar", states: ["Listo"] },
];

function stateStyle(state) {
  if (state === "Pendiente") return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "En Preparación") return "border-blue-200 bg-blue-50 text-blue-800";
  if (state === "Listo") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-violet-200 bg-violet-50 text-violet-800";
}

function nextState(state) {
  if (state === "Pendiente") return "En Preparación";
  if (state === "En Preparación") return "Listo";
  if (state === "Listo") return "Entregado";
  return null;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" });
}

export function KitchenView() {
  const snackbar = useSnackbar();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("live");

  const loadKitchen = useCallback(async () => {
    try {
      const data = await backofficeApi.cocinaOrdenes();
      const items = Array.isArray(data) ? data : data?.items || [];
      setOrders(items);
    } catch (e) {
      setError(e.message || "No se pudo cargar cocina.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const startPolling = () => {
      if (timer) clearInterval(timer);
      const intervalMs = document.hidden ? 15000 : 3000;
      timer = setInterval(() => {
        loadKitchen().catch(() => {});
      }, intervalMs);
    };

    (async () => {
      await loadKitchen();
      if (!mounted) return;
      startPolling();
    })();

    const handleVisibilityChange = () => {
      if (!mounted) return;
      // Reconfigura el intervalo según si la pestaña está visible o no.
      startPolling();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timer) clearInterval(timer);
    };
  }, [loadKitchen]);

  const patchState = async (order) => {
    const id = order?.id ?? order?.Id;
    const current = order?.estadoCocina ?? order?.EstadoCocina ?? "Pendiente";
    const next = nextState(current);
    if (!id || !next) return;
    setBusyId(id);
    setError("");
    try {
      await backofficeApi.cocinaOrdenEstado(id, next);
      snackbar.success(`Orden ${order?.numero || id} -> ${next}`);
      await loadKitchen();
    } catch (e) {
      const msg = e?.message || "No se pudo actualizar estado de cocina.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.filter((o) => {
      const state = o?.estadoCocina ?? o?.EstadoCocina ?? "Pendiente";
      if (mode === "history") {
        if (state !== "Entregado") return false;
      } else if (state === "Entregado") {
        return false;
      }
      if (!q) return true;
      const text = `${o?.numero || o?.id || ""} ${o?.mesa || o?.mesaNombre || ""}`.toLowerCase();
      return text.includes(q);
    });
    if (mode === "history") {
      list.sort((a, b) => {
        const da = new Date(a?.fechaCreacion ?? a?.FechaCreacion ?? 0).getTime();
        const db = new Date(b?.fechaCreacion ?? b?.FechaCreacion ?? 0).getTime();
        return db - da;
      });
    }
    return list;
  }, [orders, search, mode]);

  const grouped = useMemo(() => {
    const base = Object.fromEntries(KDS_SECTIONS.map((s) => [s.key, []]));
    filtered.forEach((o) => {
      const state = o?.estadoCocina ?? o?.EstadoCocina ?? "Pendiente";
      const section = KDS_SECTIONS.find((s) => s.states.includes(state));
      if (!section) return;
      base[section.key].push(o);
    });
    return base;
  }, [filtered]);

  if (loading) return <ListSkeleton rows={6} />;
  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Cocina (KDS)</h2>
            <p className="text-xs text-slate-500">
              Solo aparecen ítems de categorías marcadas para cocina; bebidas u otras categorías “solo barra” no se listan aquí.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadKitchen()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por orden o mesa"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "live" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Cocina en vivo
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("history");
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "history" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Historial
            </button>
          </div>
        </div>
      </section>

      {mode === "live" ? (
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {KDS_SECTIONS.map((section) => (
          <article key={section.key} className="min-h-[220px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${stateStyle(section.states[0])}`}>{section.label}</span>
              <span className="text-xs font-semibold text-slate-500">{grouped[section.key]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[section.key] || []).length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-2 py-4 text-center text-xs text-slate-400">Sin órdenes</p>}
              {(grouped[section.key] || []).map((o, i) => {
                const id = o?.id ?? o?.Id ?? i;
                const numero = o?.numero || o?.Numero || `#${id}`;
                const mesa = o?.mesa || o?.mesaNombre || o?.Mesa || "Mesa";
                const createdAt = o?.fechaCreacion ?? o?.FechaCreacion;
                const current = o?.estadoCocina ?? o?.EstadoCocina ?? "Pendiente";
                const rawItems = o?.Items ?? o?.items ?? [];
                const items = Array.isArray(rawItems) ? rawItems : [];
                const next = nextState(current);
                return (
                  <div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{numero}</p>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${stateStyle(current)}`}>{current}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{mesa}</p>
                    <p className="text-xs text-slate-500">{formatDate(createdAt)}</p>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[11px] font-semibold text-slate-700">Productos</p>
                      {items.length === 0 ? (
                        <p className="mt-1 text-[11px] text-slate-400">Sin items en la orden.</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {items.map((it, idx) => {
                            const itemId = it?.Id ?? it?.id ?? `${id}-${idx}`;
                            const qty = Number(it?.Cantidad ?? it?.cantidad ?? 0);
                            const producto = it?.Producto ?? it?.producto ?? "Producto";
                            const notas = it?.Notas ?? it?.notas ?? "";
                            return (
                              <li key={itemId} className="rounded border border-slate-100 bg-slate-50 px-1.5 py-1">
                                <p className="text-[11px] font-medium text-slate-800">
                                  {qty > 0 ? `${qty}x ` : ""}{producto}
                                </p>
                                {notas ? <p className="text-[10px] text-slate-500">Nota: {notas}</p> : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {next ? (
                      <button
                        type="button"
                        onClick={() => patchState(o)}
                        disabled={busyId === id}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {current === "Pendiente" && <ChefHat className="h-3.5 w-3.5" />}
                        {current === "En Preparación" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {current === "Listo" && <Send className="h-3.5 w-3.5" />}
                        {busyId === id ? "Procesando..." : `Marcar ${next}`}
                      </button>
                    ) : (
                      <div className="mt-2 rounded-md bg-violet-50 px-2 py-1.5 text-center text-[11px] font-semibold text-violet-700">Orden entregada</div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-2 md:hidden">
            {filtered.length === 0 && <p className="rounded-lg border border-slate-200 px-3 py-5 text-center text-sm text-slate-500">No hay órdenes entregadas para mostrar.</p>}
            {filtered.map((o, i) => {
              const id = o?.id ?? o?.Id ?? i;
              const numero = o?.numero ?? o?.Numero ?? `#${id}`;
              const mesa = o?.mesa || o?.Mesa || "S/M";
              const estado = o?.estadoCocina ?? o?.EstadoCocina ?? "Entregado";
              const fecha = o?.fechaCreacion ?? o?.FechaCreacion;
              const itemsRaw = o?.Items ?? o?.items ?? [];
              const items = Array.isArray(itemsRaw) ? itemsRaw : [];
              return (
                <article key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{numero}</p>
                    <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{estado}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{mesa}</p>
                  <p className="text-xs text-slate-500">{formatDate(fecha)}</p>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-slate-700">Productos</p>
                    {items.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-400">Sin productos</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {items.map((it, idx) => {
                          const itemId = it?.Id ?? it?.id ?? `${id}-${idx}`;
                          const qty = Number(it?.Cantidad ?? it?.cantidad ?? 0);
                          const producto = it?.Producto ?? it?.producto ?? "Producto";
                          return (
                            <li key={itemId} className="text-[11px] text-slate-700">
                              {qty > 0 ? `${qty}x ` : ""}{producto}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Orden</th>
                  <th className="px-4 py-3 font-semibold">Mesa</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Productos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No hay órdenes entregadas para mostrar.
                    </td>
                  </tr>
                )}
                {filtered.map((o, i) => {
                  const id = o?.id ?? o?.Id ?? i;
                  const numero = o?.numero ?? o?.Numero ?? `#${id}`;
                  const mesa = o?.mesa || o?.Mesa || "S/M";
                  const estado = o?.estadoCocina ?? o?.EstadoCocina ?? "Entregado";
                  const fecha = o?.fechaCreacion ?? o?.FechaCreacion;
                  const itemsRaw = o?.Items ?? o?.items ?? [];
                  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
                  return (
                    <tr key={id} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-800">{numero}</td>
                      <td className="px-4 py-3 text-slate-700">{mesa}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(fecha)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{estado}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {items.length === 0 ? (
                          "-"
                        ) : (
                          <ul className="space-y-1">
                            {items.map((it, idx) => {
                              const itemId = it?.Id ?? it?.id ?? `${id}-${idx}`;
                              const qty = Number(it?.Cantidad ?? it?.cantidad ?? 0);
                              const producto = it?.Producto ?? it?.producto ?? "Producto";
                              return (
                                <li key={itemId} className="text-xs">
                                  {qty > 0 ? `${qty}x ` : ""}{producto}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

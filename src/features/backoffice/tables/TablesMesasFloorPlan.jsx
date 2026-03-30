import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import { MoreVertical, Pencil, Trash2, Lock, GripVertical } from "lucide-react";
import { mesaCardShellClass } from "./mesaVisual.js";
import {
  buildPlanoPositionsWithDefaults,
  clampPlanoMesaScale,
  MESA_PLANO_BASE_H,
  MESA_PLANO_BASE_W,
  readMesaPlanoPositions,
  writeMesaPlanoPositions,
} from "../utils/mesaPlanoLayout.js";

function FloorMesaNode({
  table,
  position,
  selected,
  onSelect,
  onScaleCommit,
  cajaAbierta,
  isAdmin,
  tableIllustration,
  activeTableMenu,
  setActiveTableMenu,
  onOpenPos,
  onOpenEdit,
  onRequestDelete,
  onDragStop,
}) {
  const nodeRef = useRef(null);
  const [resizeTmp, setResizeTmp] = useState(null);
  const [resizing, setResizing] = useState(false);
  const scale = resizeTmp ?? clampPlanoMesaScale(position?.s ?? 1);
  const outerW = MESA_PLANO_BASE_W * scale;
  const outerH = MESA_PLANO_BASE_H * scale;
  const { shell, onDark } = mesaCardShellClass(table);

  const handleStop = useCallback(
    (_, data) => {
      onDragStop(table.id, data.x, data.y);
    },
    [onDragStop, table.id]
  );

  const onResizePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const ax = rect.left;
    const ay = rect.top;
    const d0 = Math.hypot(e.clientX - ax, e.clientY - ay);
    const startScale = clampPlanoMesaScale(position?.s ?? 1);
    if (d0 < 8) return;
    setResizing(true);
    let last = startScale;
    const onMove = (ev) => {
      const d1 = Math.hypot(ev.clientX - ax, ev.clientY - ay);
      last = clampPlanoMesaScale(startScale * (d1 / d0));
      setResizeTmp(last);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setResizeTmp(null);
      setResizing(false);
      onScaleCommit(table.id, last);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".mesa-plano-handle"
      position={{ x: position.x, y: position.y }}
      bounds="parent"
      disabled={resizing}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        className={`absolute left-0 top-0 z-10 select-none rounded-md ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
        style={{ width: outerW, height: outerH }}
        onMouseDown={(e) => {
          if (e.target.closest("[data-plano-resize-handle]")) return;
          e.stopPropagation();
          onSelect(table.id);
        }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: MESA_PLANO_BASE_W,
            height: MESA_PLANO_BASE_H,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className={`group relative h-full w-[6.875rem] overflow-hidden rounded-md border-2 shadow-md transition ${shell} ${cajaAbierta ? "" : "opacity-95"}`}
          >
            {!cajaAbierta && <div className="pointer-events-none absolute inset-0 z-20 rounded-md bg-slate-900/15" />}

            <div
              className={`mesa-plano-handle flex cursor-grab items-center gap-0.5 border-b border-black/10 px-1 py-0.5 active:cursor-grabbing ${
                onDark ? "bg-black/10" : "bg-slate-100"
              }`}
            >
              <GripVertical className={`h-3 w-3 shrink-0 ${onDark ? "text-white/80" : "text-slate-500"}`} />
              <span className={`min-w-0 flex-1 truncate text-center text-[9px] font-bold uppercase ${onDark ? "text-white" : "text-slate-800"}`}>
                {table.displayId}
              </span>
              {table.hasActiveOrder && table.activeOrdersCount > 0 ? (
                <span className="shrink-0 rounded-full bg-red-400 px-0.5 text-[8px] font-bold leading-none text-white">{table.activeOrdersCount}</span>
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
            </div>

            {isAdmin && (
              <>
                <div className="absolute right-0.5 top-6 z-30 hidden gap-0.5 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto lg:flex">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onOpenEdit(table.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/40 bg-white/95 text-slate-700 shadow-sm hover:bg-white"
                    title="Editar"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRequestDelete(table.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-red-200 bg-white/95 text-red-600 shadow-sm hover:bg-white"
                    title="Eliminar"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="absolute right-0.5 top-6 z-30 lg:hidden">
                  <button
                    type="button"
                    aria-label="Acciones"
                    data-table-menu-trigger
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveTableMenu((curr) => (curr === table.id ? null : table.id));
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/40 bg-white/95 text-slate-700 shadow-sm"
                  >
                    <MoreVertical className="h-2.5 w-2.5" />
                  </button>
                  {activeTableMenu === table.id && (
                    <div className="absolute right-0 top-6 z-40 w-24 overflow-hidden rounded-md border border-slate-200 bg-white text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTableMenu(null);
                          onOpenEdit(table.id);
                        }}
                        className="flex w-full items-center gap-1 px-1.5 py-1 text-[9px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-2.5 w-2.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTableMenu(null);
                          onRequestDelete(table.id);
                        }}
                        className="flex w-full items-center gap-1 px-1.5 py-1 text-[9px] font-semibold text-red-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Borrar
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(table.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (cajaAbierta) onOpenPos(table);
              }}
              disabled={!cajaAbierta}
              className="relative z-10 flex w-full flex-col items-center px-0.5 pb-1 pt-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src={tableIllustration} alt={`Mesa ${table.displayId}`} className="h-11 w-full object-contain opacity-95" />
              <span className={`mt-0.5 text-[8px] font-semibold ${onDark ? "text-white/90" : "text-slate-600"}`}>
                {cajaAbierta ? "Doble clic: abrir" : "Caja cerrada"}
              </span>
            </button>

            {!cajaAbierta && (
              <div className="pointer-events-none absolute bottom-0.5 left-0.5 right-0.5 z-20 flex items-center justify-center gap-0.5 rounded bg-white/90 py-px text-[7px] font-semibold text-slate-700">
                <Lock className="h-2 w-2" />
              </div>
            )}
          </div>
        </div>

        {selected && (
          <>
            <div className="pointer-events-none absolute -left-1 -top-1 z-20 h-2 w-2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute -right-1 -top-1 z-20 h-2 w-2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute -left-1 -bottom-1 z-20 h-2 w-2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute left-1/2 -top-1 z-20 h-2 w-2 -translate-x-1/2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute -left-1 top-1/2 z-20 h-2 w-2 -translate-y-1/2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute -right-1 top-1/2 z-20 h-2 w-2 -translate-y-1/2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div className="pointer-events-none absolute bottom-1 left-1/2 z-20 h-2 w-2 -translate-x-1/2 rounded-sm border border-blue-500 bg-white shadow-sm" />
            <div
              data-plano-resize-handle
              title="Arrastrar para cambiar tamaño"
              className="absolute -bottom-1.5 -right-1.5 z-30 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-blue-500 bg-white shadow-md hover:bg-blue-50"
              onPointerDown={onResizePointerDown}
            />
          </>
        )}
      </div>
    </Draggable>
  );
}

export function TablesMesasFloorPlan({
  tables,
  cajaAbierta,
  isAdmin,
  tableIllustration,
  activeTableMenu,
  setActiveTableMenu,
  onOpenPos,
  onOpenEdit,
  onRequestDelete,
}) {
  const [positions, setPositions] = useState(() => readMesaPlanoPositions());
  const [selectedMesaId, setSelectedMesaId] = useState(null);
  const tableIdsKey = useMemo(() => [...tables.map((t) => t.id)].sort().join(","), [tables]);
  const tablesRef = useRef(tables);

  useLayoutEffect(() => {
    tablesRef.current = tables;
  });

  useEffect(() => {
    setPositions((prev) => {
      const merged = buildPlanoPositionsWithDefaults(tablesRef.current, prev);
      writeMesaPlanoPositions(merged);
      return merged;
    });
  }, [tableIdsKey]);

  const onDragStop = useCallback((mesaId, x, y) => {
    const id = String(mesaId);
    setPositions((prev) => {
      const cur = prev[id] ?? { x: 0, y: 0, s: 1 };
      const next = { ...prev, [id]: { ...cur, x, y } };
      writeMesaPlanoPositions(next);
      return next;
    });
  }, []);

  const onScaleCommit = useCallback((mesaId, s) => {
    const id = String(mesaId);
    setPositions((prev) => {
      const cur = prev[id] ?? { x: 0, y: 0, s: 1 };
      const next = { ...prev, [id]: { ...cur, s: clampPlanoMesaScale(s) } };
      writeMesaPlanoPositions(next);
      return next;
    });
  }, []);

  const planContentSize = useMemo(() => {
    const pad = 48;
    let maxX = MESA_PLANO_BASE_W + pad;
    let maxY = MESA_PLANO_BASE_H + pad;
    for (const t of tables) {
      const id = String(t.id);
      const p = positions[id];
      const s = p ? clampPlanoMesaScale(p.s) : 1;
      const px = p && Number.isFinite(p.x) ? p.x : 0;
      const py = p && Number.isFinite(p.y) ? p.y : 0;
      maxX = Math.max(maxX, px + MESA_PLANO_BASE_W * s + pad);
      maxY = Math.max(maxY, py + MESA_PLANO_BASE_H * s + pad);
    }
    return { width: Math.max(480, maxX), height: Math.max(360, maxY) };
  }, [tables, positions]);

  if (tables.length === 0) {
    return <p className="text-sm text-slate-500">No hay mesas registradas.</p>;
  }

  const selectedValid =
    selectedMesaId != null && tables.some((t) => t.id === selectedMesaId) ? selectedMesaId : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative w-full flex-1 min-h-[min(42vh,16rem)] overflow-auto overscroll-contain rounded-xl border-2 border-dashed border-slate-300 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[length:24px_24px] bg-slate-50 [-webkit-overflow-scrolling:touch] lg:min-h-0">
        <div
          className="relative"
          style={{ width: planContentSize.width, height: planContentSize.height }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedMesaId(null);
          }}
        >
          {tables.map((table) => {
            const id = String(table.id);
            const pos = positions[id] ?? { x: 0, y: 0, s: 1 };
            return (
              <FloorMesaNode
                key={table.id}
                table={table}
                position={pos}
                selected={selectedValid === table.id}
                onSelect={setSelectedMesaId}
                onScaleCommit={onScaleCommit}
                cajaAbierta={cajaAbierta}
                isAdmin={isAdmin}
                tableIllustration={tableIllustration}
                activeTableMenu={activeTableMenu}
                setActiveTableMenu={setActiveTableMenu}
                onOpenPos={onOpenPos}
                onOpenEdit={onOpenEdit}
                onRequestDelete={onRequestDelete}
                onDragStop={onDragStop}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

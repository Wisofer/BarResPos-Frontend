import React, { useRef, useCallback } from "react";
import Draggable from "react-draggable";
import { MoreVertical, Pencil, Trash2, Lock, GripVertical } from "lucide-react";
import { mesaCardShellClass } from "./mesaVisual.js";
import { useMesaResize } from "./hooks/useMesaResize.js";
import { MESA_PLANO_BASE_H, MESA_PLANO_BASE_W } from "../utils/mesaPlanoLayout.js";

export const FloorMesaNode = React.memo(function FloorMesaNode({
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
  const { scale, resizing, startResize } = useMesaResize(
    position?.s ?? 1,
    onScaleCommit,
    table.id
  );

  const outerW = MESA_PLANO_BASE_W * scale;
  const outerH = MESA_PLANO_BASE_H * scale;
  const { shell, onDark } = mesaCardShellClass(table);

  const handleStop = useCallback(
    (_, data) => {
      onDragStop(table.id, data.x, data.y);
    },
    [onDragStop, table.id]
  );

  const onResizePointerDown = useCallback((e) => {
    startResize(e, nodeRef.current);
  }, [startResize, position?.s, onScaleCommit, table.id]);

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
              className={`mesa-plano-handle flex cursor-grab items-center gap-0.5 border-b border-black/10 px-1 py-0.5 active:cursor-grabbing ${onDark ? "bg-black/10" : "bg-slate-100"
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
}, (prevProps, nextProps) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.s === nextProps.position.s &&
    prevProps.cajaAbierta === nextProps.cajaAbierta &&
    prevProps.activeTableMenu === nextProps.activeTableMenu &&
    prevProps.table.estado === nextProps.table.estado &&
    prevProps.table.activeOrdersCount === nextProps.table.activeOrdersCount
  );
});

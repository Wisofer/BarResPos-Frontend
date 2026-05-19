import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FloorMesaNode } from "./FloorMesaNode.jsx";
import {
  buildPlanoPositionsWithDefaults,
  clampPlanoMesaScale,
  MESA_PLANO_BASE_H,
  MESA_PLANO_BASE_W,
  readMesaPlanoPositions,
  writeMesaPlanoPositions,
} from "../utils/mesaPlanoLayout.js";

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
  isFullscreen = false,
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
    const defaultW = isFullscreen ? 2400 : 800;
    const defaultH = isFullscreen ? 1400 : 500;
    return { width: Math.max(defaultW, maxX), height: Math.max(defaultH, maxY) };
  }, [tables, positions, isFullscreen]);

  if (tables.length === 0) {
    return <p className="text-sm text-slate-500">No hay mesas registradas.</p>;
  }

  const selectedValid =
    selectedMesaId != null && tables.some((t) => t.id === selectedMesaId) ? selectedMesaId : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={`relative w-full flex-1 min-h-[min(42vh,16rem)] overflow-auto overscroll-contain bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[length:24px_24px] bg-slate-50 [-webkit-overflow-scrolling:touch] lg:min-h-0 ${
        isFullscreen ? "border-0 rounded-none" : "rounded-xl border-2 border-dashed border-slate-300"
      }`}>
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

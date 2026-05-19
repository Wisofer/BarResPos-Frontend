import { useState } from "react";
import { clampPlanoMesaScale } from "../../utils/mesaPlanoLayout";

export function useMesaResize(initialScale, onScaleCommit, tableId) {
  const [resizeTmp, setResizeTmp] = useState(null);
  const [resizing, setResizing] = useState(false);

  const startResize = (e, node) => {
    if (!node) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = node.getBoundingClientRect();
    const ax = rect.left;
    const ay = rect.top;
    const d0 = Math.hypot(e.clientX - ax, e.clientY - ay);
    const startScale = clampPlanoMesaScale(initialScale);
    
    if (d0 < 8) return;
    setResizing(true);
    let lastScale = startScale;

    const onMove = (ev) => {
      const d1 = Math.hypot(ev.clientX - ax, ev.clientY - ay);
      lastScale = clampPlanoMesaScale(startScale * (d1 / d0));
      setResizeTmp(lastScale);
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setResizeTmp(null);
      setResizing(false);
      onScaleCommit(tableId, lastScale);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return {
    scale: resizeTmp ?? clampPlanoMesaScale(initialScale),
    resizing,
    startResize,
  };
}

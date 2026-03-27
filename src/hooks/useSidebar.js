import { useState, useEffect, useCallback } from "react";
import { SIDEBAR_STORAGE_KEY as STORAGE_KEY } from "../config/brand.js";

export function useSidebar() {
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "false");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsedState((c) => !c), []);

  return [collapsed, toggle];
}

import { useCallback, useEffect, useRef } from "react";

/**
 * Dispara `fetchList` cuando `active` es true: primera vez o tras `requestImmediateRefetch` sin espera;
 * si cambia `debounceKey` (p. ej. búsqueda), espera `debounceMs` y pone loading antes de la espera.
 */
export function useDebouncedListRefetch({ active, debounceKey, fetchList, setLoading, debounceMs = 300 }) {
  const mountedOnceRef = useRef(false);
  const skipDebounceRef = useRef(false);

  const requestImmediateRefetch = useCallback(() => {
    skipDebounceRef.current = true;
    setLoading(true);
  }, [setLoading]);

  useEffect(() => {
    if (!active) return;

    const instant = !mountedOnceRef.current || skipDebounceRef.current;
    if (skipDebounceRef.current) skipDebounceRef.current = false;
    if (!mountedOnceRef.current) mountedOnceRef.current = true;

    const ms = instant ? 0 : debounceMs;
    if (ms > 0) setLoading(true);

    const t = setTimeout(() => void fetchList(), ms);
    return () => clearTimeout(t);
  }, [active, debounceKey, fetchList, debounceMs, setLoading]);

  return { requestImmediateRefetch };
}

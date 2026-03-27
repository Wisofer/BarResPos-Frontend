import { useState, useEffect, useCallback } from "react";
import { testimonialsApi } from "../api/testimonials.js";

function isPending(t) {
  return t && t.isApproved !== true && t.isApproved !== false;
}

export function usePendingTestimonialsCount() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(() => {
    testimonialsApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPendingCount(list.filter(isPending).length);
      })
      .catch(() => setPendingCount(0))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchCount]);

  return { pendingCount, loading };
}

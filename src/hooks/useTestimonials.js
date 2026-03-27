import { useState, useCallback, useEffect } from "react";
import { testimonialsApi } from "../api/testimonials.js";

export function useTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await testimonialsApi.list();
      const list = Array.isArray(data) ? data : [];
      setTestimonials(list);
    } catch (e) {
      setError(e?.message || "Error al cargar testimonios");
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const create = useCallback(async (body) => {
    const created = await testimonialsApi.create(body);
    setTestimonials((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id - b.id)));
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await testimonialsApi.update(id, body);
    setTestimonials((prev) =>
      prev
        .map((t) => (t.id === id || t.id === Number(id) ? updated : t))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id - b.id))
    );
    return updated;
  }, []);

  const approve = useCallback(async (id, approved) => {
    await testimonialsApi.approve(id, approved);
    setTestimonials((prev) =>
      prev.map((t) =>
        t.id === id || t.id === Number(id) ? { ...t, isApproved: approved } : t
      )
    );
  }, []);

  const remove = useCallback(async (id) => {
    await testimonialsApi.delete(id);
    setTestimonials((prev) => prev.filter((t) => t.id !== id && t.id !== Number(id)));
  }, []);

  return {
    testimonials,
    loading,
    error,
    refetch: fetchTestimonials,
    create,
    update,
    approve,
    remove,
  };
}

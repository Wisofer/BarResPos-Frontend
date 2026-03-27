import { useState, useCallback, useEffect } from "react";
import { websiteServicesApi } from "../api/websiteServices.js";

export function useWebsiteServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await websiteServicesApi.list();
      const list = Array.isArray(data) ? data : [];
      setServices(list);
    } catch (e) {
      setError(e?.message || "Error al cargar servicios");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const create = useCallback(async (body) => {
    const created = await websiteServicesApi.create(body);
    setServices((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id - b.id)));
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await websiteServicesApi.update(id, body);
    setServices((prev) =>
      prev
        .map((s) => (s.id === id || s.id === Number(id) ? updated : s))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id - b.id))
    );
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await websiteServicesApi.delete(id);
    setServices((prev) => prev.filter((s) => s.id !== id && s.id !== Number(id)));
  }, []);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    create,
    update,
    remove,
  };
}

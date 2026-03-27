import { useState, useCallback, useEffect } from "react";
import { whatsappTemplatesApi } from "../api/whatsappTemplates.js";

export function useWhatsAppTemplates(params = {}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await whatsappTemplatesApi.list(params);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Error al cargar plantillas");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [params.onlyActive]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const getDefault = useCallback(async () => {
    try {
      return await whatsappTemplatesApi.getDefault();
    } catch (e) {
      return null;
    }
  }, []);

  const create = useCallback(async (body) => {
    const created = await whatsappTemplatesApi.create(body);
    setTemplates((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await whatsappTemplatesApi.update(id, body);
    setTemplates((prev) => prev.map((t) => (t.id === id || t.id === Number(id) ? updated : t)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await whatsappTemplatesApi.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id && t.id !== Number(id)));
  }, []);

  return { templates, loading, error, refetch: fetchList, getDefault, create, update, remove };
}

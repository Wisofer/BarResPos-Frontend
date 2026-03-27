import { useState, useCallback, useEffect } from "react";
import { usersApi } from "../api/users.js";

export function useUsers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const update = useCallback(async (id, body) => {
    const updated = await usersApi.update(id, body);
    setList((prev) => prev.map((u) => (u.id === id || u.id === Number(id) ? updated : u)));
    return updated;
  }, []);

  const create = useCallback(async (body) => {
    const created = await usersApi.create(body);
    setList((prev) => [...prev, created]);
    return created;
  }, []);

  const remove = useCallback(async (id) => {
    await usersApi.delete(id);
    setList((prev) => prev.filter((u) => u.id !== id && u.id !== Number(id)));
  }, []);

  return { users: list, loading, error, refetch: fetchList, create, update, remove };
}

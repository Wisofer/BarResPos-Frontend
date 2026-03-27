import { useState, useCallback, useEffect } from "react";
import { activityApi } from "../api/activity.js";

export function useActivity(limit = 20) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityApi.list({ limit });
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchList(); }, [fetchList]);

  return { activity: list, loading, error, refetch: fetchList };
}

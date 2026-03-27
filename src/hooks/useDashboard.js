import { useState, useCallback, useEffect } from "react";
import { dashboardApi } from "../api/dashboard.js";

export function useDashboard() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, act, monthly, top, alertsData] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.recentActivity({ limit: 50 }),
        dashboardApi.monthlyIncome({ months: 12 }),
        dashboardApi.topProducts(),
        dashboardApi.alerts().catch(() => null),
      ]);
      setSummary(sum || {});
      setActivity(Array.isArray(act) ? act : []);
      setMonthlyIncome(Array.isArray(monthly) ? monthly : []);
      setTopProducts(Array.isArray(top) ? top : []);
      setAlerts(alertsData && typeof alertsData === "object" ? alertsData : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { summary, activity, monthlyIncome, topProducts, alerts, loading, error, refetch: fetchAll };
}

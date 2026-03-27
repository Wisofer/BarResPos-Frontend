import { useState, useCallback, useEffect } from "react";
import { exchangeRateApi } from "../api/exchangeRate.js";

const DEFAULT_RATE = 36.8;

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await exchangeRateApi.get();
      setExchangeRate(data?.exchangeRate ?? DEFAULT_RATE);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const update = useCallback(async (value) => {
    const data = await exchangeRateApi.update({ exchangeRate: value });
    setExchangeRate(data?.exchangeRate ?? value);
    return data;
  }, []);

  return { exchangeRate, loading, error, refetch: fetchRate, update };
}

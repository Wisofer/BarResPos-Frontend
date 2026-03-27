import { useState, useCallback, useEffect } from "react";
import { agencyApi } from "../api/agency.js";
import { DEFAULT_COMPANY_NAME, DEFAULT_CURRENCY } from "../config/brand.js";

const defaults = {
  id: 0,
  companyName: DEFAULT_COMPANY_NAME,
  email: "",
  phone: "",
  address: "",
  currency: DEFAULT_CURRENCY,
  updatedAt: null,
};

export function useAgency() {
  const [agency, setAgency] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgency = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agencyApi.get();
      setAgency({ ...defaults, ...data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgency();
  }, [fetchAgency]);

  const update = useCallback(async (body) => {
    const updated = await agencyApi.update(body);
    setAgency((prev) => ({ ...prev, ...updated }));
    return updated;
  }, []);

  return { agency, loading, error, refetch: fetchAgency, update };
}

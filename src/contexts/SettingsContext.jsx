import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { settingsApi } from "../api/settings.js";
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_SOUND_VOLUME,
  SETTINGS_STORAGE_KEY,
} from "../config/brand.js";

/** Solo "dark" es oscuro; cualquier otro valor (undefined, null, "light", etc.) → claro */
function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

const defaults = {
  companyName: DEFAULT_COMPANY_NAME,
  email: "",
  phone: "",
  address: "",
  currency: DEFAULT_CURRENCY,
  language: "es",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  theme: "light",
  soundVolume: DEFAULT_SOUND_VOLUME,
  alertsFacturasVencidas: true,
  alertsRecordatorios: false,
  alertsReservacionesPendientes: true,
  updatedAt: null,
};

/** Solo escribe en estado valores definidos (no undefined) para no pisar datos de la agencia cuando el backend devuelve parcial. */
function mergeDefined(prev, from) {
  const next = { ...prev };
  if (from && typeof from === "object") {
    Object.entries(from).forEach(([k, v]) => {
      if (v !== undefined) next[k] = v;
    });
  }
  return next;
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.get();
      const next = { ...defaults, ...data };
      next.theme = normalizeTheme(data?.theme);
      setSettings(next);
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch (_) {}
    } catch (e) {
      setError(e.message);
      setSettings(defaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const update = useCallback(async (body) => {
    const updated = await settingsApi.update(body);
    setSettings((prev) => {
      const raw = mergeDefined(prev, updated || body);
      const next = { ...raw, theme: normalizeTheme(raw.theme) };
      return next;
    });
    return updated;
  }, []);

  const value = { settings, loading, error, refetch: fetchSettings, update };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx == null) {
    return {
      settings: defaults,
      loading: false,
      error: null,
      refetch: () => Promise.resolve(),
      update: async (body) => body,
    };
  }
  return ctx;
}

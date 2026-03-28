import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi } from "../api/auth.js";
import { setOnUnauthorized } from "../api/client.js";
import { getToken, setToken, setRefreshToken, getRefreshToken, clearToken } from "../api/token.js";
import { normalizeAuthUser } from "../utils/authUser.js";

const AuthContext = createContext(null);
const STATIC_USER_KEY = "barrest-static-user";
const isStaticMode = import.meta.env.VITE_STATIC_MODE === "true";

function getStoredStaticUser() {
  try {
    const raw = localStorage.getItem(STATIC_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredStaticUser(user) {
  localStorage.setItem(STATIC_USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    if (isStaticMode) {
      const raw = getStoredStaticUser();
      const normalized = raw ? normalizeAuthUser(raw) || raw : null;
      setUser(normalized);
      setLoading(false);
      return normalized;
    }

    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await authApi.me();
      const normalized = normalizeAuthUser(data);
      if (normalized) {
        setUser(normalized);
        return normalized;
      }
      setUser(null);
      return null;
    } catch {
      clearToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearToken();
      setUser(null);
    });
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (nombreUsuario, contrasena) => {
    setSessionLoading(true);
    try {
      if (isStaticMode) {
        const normalizedName = nombreUsuario?.trim();
        if (!normalizedName || !contrasena) throw new Error("Ingresa usuario y contraseña.");
        const staticUser = normalizeAuthUser({
          id: 1,
          nombreUsuario: normalizedName,
          rol: "admin",
        });
        setStoredStaticUser(staticUser);
        setUser(staticUser);
        return { user: staticUser };
      }

      const data = await authApi.login(nombreUsuario, contrasena);
      if (data?.accessToken) setToken(data.accessToken);
      if (data?.refreshToken) setRefreshToken(data.refreshToken);
      let normalized = normalizeAuthUser(data);
      if (!normalized) {
        try {
          const me = await authApi.me();
          normalized = normalizeAuthUser(me);
        } catch {
          normalized = null;
        }
      }
      if (normalized) setUser(normalized);
      return data;
    } catch (e) {
      // Fallback automatico para demos estaticas sin backend disponible.
      const msg = e?.message || "";
      if (msg.includes("fetch") || msg.includes("Failed") || msg.includes("Connection") || msg.includes("Network")) {
        const normalizedName = nombreUsuario?.trim();
        if (normalizedName && contrasena) {
          const staticUser = normalizeAuthUser({
            id: 1,
            nombreUsuario: normalizedName,
            rol: "admin",
          });
          setStoredStaticUser(staticUser);
          setUser(staticUser);
          return { user: staticUser };
        }
      }
      throw e;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setSessionLoading(true);
    try {
      if (!isStaticMode) await authApi.logout();
      const refreshToken = getRefreshToken();
      if (!isStaticMode && refreshToken) await authApi.revoke(refreshToken).catch(() => {});
    } catch (_) {}
    clearToken();
    localStorage.removeItem(STATIC_USER_KEY);
    setUser(null);
    setSessionLoading(false);
  }, []);

  const value = { user, loading, sessionLoading, login, logout, checkAuth };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

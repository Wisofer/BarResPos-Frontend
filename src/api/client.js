import { getApiUrl } from "./config.js";
import { getToken, getRefreshToken, setToken, setRefreshToken, clearToken } from "./token.js";

let onUnauthorized = () => {};
let refreshInFlight = null;

export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

function isAuthPublicRequest(path) {
  return path.includes("/api/v1/auth/login") || path.includes("/api/v1/auth/refresh");
}

function unwrapApiResponse(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const hasSuccessLower = Object.prototype.hasOwnProperty.call(payload, "success");
  const hasSuccessUpper = Object.prototype.hasOwnProperty.call(payload, "Success");

  if (hasSuccessLower) {
    if (!payload.success) throw new Error(payload.message || "Error de API");
    return payload.data;
  }

  if (hasSuccessUpper) {
    if (!payload.Success) throw new Error(payload.Message || payload.message || "Error de API");
    return payload.Data;
  }
  return payload;
}

async function runRefreshTokenFlow() {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    const url = `${getApiUrl()}/api/v1/auth/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = unwrapApiResponse(json);
    if (!data?.accessToken) return null;
    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function request(path, options = {}, retryOnUnauthorized = true) {
  const url = `${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const token = getToken();
  if (!isAuthPublicRequest(path) && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const config = {
    ...options,
    headers,
  };
  if (options.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  if (res.status === 401) {
    if (retryOnUnauthorized && !isAuthPublicRequest(path)) {
      const newAccessToken = await runRefreshTokenFlow();
      if (newAccessToken) return request(path, options, false);
    }
    clearToken();
    onUnauthorized();
    throw new Error("No autorizado");
  }
  if (!res.ok) {
    const text = await res.text();
    let errMsg = text;
    try {
      const data = JSON.parse(text);
      errMsg =
        data.message ||
        data.Message ||
        data.error ||
        data.Error ||
        data.title ||
        data.Title ||
        (typeof data.errors === "string" ? data.errors : null) ||
        text;
    } catch (_) {}
    const err = new Error(typeof errMsg === "string" && errMsg.trim() ? errMsg.trim() : `Error HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return unwrapApiResponse(json);
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

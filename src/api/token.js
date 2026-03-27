const ACCESS_TOKEN_KEY = "barrest_access_token";
const REFRESH_TOKEN_KEY = "barrest_refresh_token";

export function getToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (_) {}
}

export function getRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token) {
  try {
    if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (_) {}
}

export function clearToken() {
  setToken(null);
  setRefreshToken(null);
}

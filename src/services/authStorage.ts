const ACCESS_TOKEN_KEY = 'si_access_token';
const REFRESH_TOKEN_KEY = 'si_refresh_token';

export const AUTH_TOKEN_UPDATED_EVENT = 'si:token-updated';
export const AUTH_SESSION_EXPIRED_EVENT = 'si:session-expired';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.dispatchEvent(new Event(AUTH_TOKEN_UPDATED_EVENT));
}

export function clearAuthTokens(notifyExpired = false): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  if (notifyExpired) {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

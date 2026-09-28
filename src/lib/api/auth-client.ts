/**
 * Base URL of the headless TM auth backend (login, session, user management).
 * May be a different origin than NEXT_PUBLIC_API_BASE_URL — see FRONTEND_INTEGRATION.md.
 * Leave unset when the auth backend is proxied behind the same origin as this app.
 */
export const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? "";

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Present on 429 responses — seconds until the rate limit clears. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export interface AuthFetchOptions extends RequestInit {
  body?: string;
}

/**
 * Fetch wrapper for the TM auth backend. Always sends the httpOnly session
 * cookie (`credentials: "include"`) and normalizes error bodies into
 * `AuthApiError` so callers can branch on status without re-parsing JSON.
 */
export async function authFetch<T>(path: string, init: AuthFetchOptions = {}): Promise<T> {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    throw new AuthApiError(
      body?.error ?? response.statusText,
      response.status,
      retryAfterHeader ? Number(retryAfterHeader) : undefined,
    );
  }

  return body as T;
}

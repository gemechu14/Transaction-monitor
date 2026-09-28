import type { QueryValue } from "@/types/api";

/**
 * Base URL for the REST API exposed by the WSO2 API Gateway.
 * Set NEXT_PUBLIC_API_BASE_URL in .env.local once the real gateway URL is known.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL || "http://placeholder.local");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`;
}

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, QueryValue>;
}

/** Thin, typed wrapper around fetch for calling the transaction monitoring API. */
export async function apiFetch<T>(
  path: string,
  { params, headers, ...init }: ApiFetchOptions = {},
): Promise<T> {
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
      url,
    );
  }

  return response.json() as Promise<T>;
}

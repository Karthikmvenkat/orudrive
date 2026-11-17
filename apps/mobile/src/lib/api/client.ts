import { apiBaseUrl } from '@/lib/api/config';
import { ApiError } from '@/lib/api/errors';
import type { ApiAuthResponse, PageMeta } from '@/lib/api/types';
import { sessionStore, type SessionStore } from '@/lib/session/store';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Set false for public endpoints so a stale token is never attached. */
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type ApiClientConfig = {
  baseUrl?: string;
  store?: SessionStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type ApiClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Unwraps `{ data, meta }` list envelopes into a shape the screens can render directly. */
  requestPaged<T>(path: string, options?: RequestOptions): Promise<{ items: T[]; meta: PageMeta }>;
  /** Resolved on first call, so importing this module never depends on the origin being available. */
  baseUrl(): string;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A proxy or gateway answering in plain text must not crash the caller.
    return { message: text };
  }
}

function toApiError(response: Response, payload: unknown): ApiError {
  const record = (payload ?? {}) as Record<string, unknown>;
  return new ApiError({
    statusCode: typeof record.statusCode === 'number' ? record.statusCode : response.status,
    code: typeof record.code === 'string' ? record.code : `HTTP_${response.status}`,
    message:
      typeof record.message === 'string'
        ? record.message
        : `The ${response.status < 500 ? 'request' : 'service'} failed (${response.status}).`,
    details: record.details,
  });
}

/**
 * The API rotates the refresh token on every use, so the pair written here
 * replaces the old one outright. Replaying the old value is rejected, which is
 * why exactly one refresh may be in flight per client — two concurrent 401s
 * must not both spend the same token.
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const store = config.store ?? sessionStore;
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let resolvedBaseUrl: string | null = config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : null;
  function baseUrl(): string {
    if (!resolvedBaseUrl) resolvedBaseUrl = apiBaseUrl().replace(/\/+$/, '');
    return resolvedBaseUrl;
  }

  async function runRefresh(refreshToken: string): Promise<ApiAuthResponse | null> {
    try {
      const response = await doFetch(`${baseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        await store.clear();
        return null;
      }
      const payload = (await response.json()) as ApiAuthResponse;
      await store.save({ accessToken: payload.accessToken, refreshToken: payload.refreshToken, user: payload.user });
      return payload;
    } catch {
      // Treat an unreachable auth endpoint as no session at all rather than as
      // a successful refresh, so callers surface a network error instead.
      return null;
    }
  }

  let refreshInFlight: Promise<ApiAuthResponse | null> | null = null;

  function refreshOnce(refreshToken: string): Promise<ApiAuthResponse | null> {
    if (!refreshInFlight) {
      refreshInFlight = runRefresh(refreshToken).finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function send(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const relayAbort = () => controller.abort();
    signal?.addEventListener('abort', relayAbort);

    try {
      return await doFetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', relayAbort);
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', query, body, auth = true, signal } = options;

    const url = buildUrl(baseUrl(), path, query);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';

    const session = auth ? await store.load() : null;
    if (auth && session?.accessToken) {
      headers.authorization = `Bearer ${session.accessToken}`;
    }

    const init: RequestInit = {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    let response = await send(url, init, signal);

    if (response.status === 401 && auth && session?.refreshToken) {
      const rotated = await refreshOnce(session.refreshToken);
      if (rotated) {
        headers.authorization = `Bearer ${rotated.accessToken}`;
        response = await send(url, init, signal);
      }
    }

    const payload = await parseBody(response);
    if (!response.ok) throw toApiError(response, payload);

    return payload as T;
  }

  return {
    request,
    async requestPaged<T>(path: string, options?: RequestOptions) {
      const payload = await request<{ data?: T[]; meta?: PageMeta } | T[]>(path, options);
      if (Array.isArray(payload)) {
        return {
          items: payload,
          meta: { page: 1, limit: payload.length, total: payload.length, totalPages: 1 },
        };
      }
      return { items: payload.data ?? [], meta: payload.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
    },
    baseUrl,
  };
}

export const api = createApiClient();

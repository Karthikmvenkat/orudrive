export interface ApiErrorPayload {
  statusCode?: number;
  error?: string;
  code?: string;
  message?: string | string[];
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  query?: Record<string, QueryValue>;
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function baseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4100/api/v1"
  ).replace(/\/+$/, "");
}

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl()}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

/**
 * The absolute API address for a path. Route handlers that pipe bytes rather
 * than JSON need the URL itself, because `apiRequest` parses a body.
 */
export function apiUrl(path: string): string {
  return withQuery(path);
}

function normalizeMessage(payload: ApiErrorPayload | null, fallback: string): string {
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(". ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    query,
    cache,
    revalidate,
    tags,
    headers,
    signal,
  } = options;

  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    method,
    signal,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) init.body = JSON.stringify(body);

  if (revalidate !== undefined || tags) {
    init.next = { revalidate, tags };
  } else {
    init.cache = cache ?? "no-store";
  }

  let response: Response;
  try {
    response = await fetch(withQuery(path, query), init);
  } catch (error) {
    throw new ApiError(
      503,
      "The SavariGo API is unreachable. Check that the backend is running.",
      "API_UNREACHABLE",
      error,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object" ? (payload as ApiErrorPayload) : null;
    throw new ApiError(
      response.status,
      normalizeMessage(errorPayload, `Request failed with status ${response.status}`),
      errorPayload?.code,
      payload,
    );
  }

  return payload as T;
}

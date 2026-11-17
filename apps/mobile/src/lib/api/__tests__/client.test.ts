import { createApiClient } from '@/lib/api/client';
import { ApiError, describeApiError } from '@/lib/api/errors';
import { createSessionStore, memoryBackend, type SessionStore } from '@/lib/session/store';
import type { SessionUser } from '@/lib/api/types';

const BASE_URL = 'https://api.test/api/v1';

const USER: SessionUser = {
  id: 'u_1',
  email: 'ravi@example.test',
  phone: '+919000000000',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  fullName: 'Ravi',
  roles: ['CUSTOMER'],
  createdAt: '2026-11-01T00:00:00.000Z',
};

type Call = {
  path: string;
  method: string;
  authorization?: string;
  headers: Record<string, string>;
  body?: string;
};

function jsonResponse(status: number, payload?: unknown): Response {
  return new Response(payload === undefined ? null : JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * The client reuses one headers object when it replays a request after a
 * refresh, so the bearer token is copied out at call time rather than read back
 * from the captured object later.
 */
function recordingFetch(calls: Call[], respond: (call: Call) => Response): typeof fetch {
  return async (url, init) => {
    const headers = { ...(init?.headers as Record<string, string>) };
    const call: Call = {
      path: String(url).slice(BASE_URL.length),
      method: init?.method ?? 'GET',
      ...(headers.authorization ? { authorization: headers.authorization } : {}),
      headers,
      ...(init?.body == null ? {} : { body: String(init.body) }),
    };
    calls.push(call);
    return respond(call);
  };
}

const emptyStore = () => createSessionStore(memoryBackend());

async function signedInStore(): Promise<SessionStore> {
  const store = emptyStore();
  await store.save({ accessToken: 'old-access', refreshToken: 'old-refresh', user: USER });
  return store;
}

describe('requests', () => {
  it('sends the bearer token and drops empty query values', async () => {
    const calls: Call[] = [];
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: await signedInStore(),
      fetchImpl: recordingFetch(calls, () => jsonResponse(200, { data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } })),
    });

    await client.request('/vehicles', { query: { page: 2, category: '', search: undefined, available: true } });

    expect(calls[0].path).toBe('/vehicles?page=2&available=true');
    expect(calls[0].authorization).toBe('Bearer old-access');
    expect(calls[0].headers.accept).toBe('application/json');
  });

  it('never attaches a stale token to a public endpoint', async () => {
    const calls: Call[] = [];
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: await signedInStore(),
      fetchImpl: recordingFetch(calls, () => jsonResponse(200, { ok: true })),
    });

    await client.request('/auth/login', { method: 'POST', auth: false, body: { email: 'a@b.test', password: 'x' } });

    expect(calls[0].authorization).toBeUndefined();
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(calls[0].body).toBe(JSON.stringify({ email: 'a@b.test', password: 'x' }));
  });

  it('reads a 204 as no content', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: async () => new Response(null, { status: 204 }),
    });

    await expect(client.request('/notifications/all-read', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('strips a trailing slash from the configured origin', () => {
    const client = createApiClient({ baseUrl: `${BASE_URL}/`, store: emptyStore() });
    expect(client.baseUrl()).toBe(BASE_URL);
  });

  it('aborts a request that outlives the timeout', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      timeoutMs: 10,
      fetchImpl: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('The request was aborted')));
        }),
    });

    await expect(client.request('/slow')).rejects.toThrow('aborted');
  });
});

describe('errors', () => {
  it('raises the API error envelope', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: async () =>
        jsonResponse(409, { statusCode: 409, code: 'AVAILABILITY_BOOKED', message: 'Slot taken', details: ['2026-11-20'] }),
    });

    const error = await client.request('/bookings').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 409, code: 'AVAILABILITY_BOOKED', message: 'Slot taken' });
    expect((error as ApiError).details).toEqual(['2026-11-20']);
  });

  it('copes with a gateway answering in plain text', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: async () => new Response('Bad gateway', { status: 502 }),
    });

    const error = (await client.request('/vehicles').catch((cause: unknown) => cause)) as ApiError;
    expect(error.code).toBe('HTTP_502');
    expect(error.message).toBe('Bad gateway');
  });

  it('says something a customer can act on', () => {
    expect(describeApiError(new ApiError({ statusCode: 429, code: 'RATE_LIMITED', message: 'Throttled' }))).toMatch(
      /Too many attempts/,
    );
    expect(
      describeApiError(
        new ApiError({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['email must be an e-mail'] }),
      ),
    ).toBe('Check the highlighted fields.');
    expect(
      describeApiError(
        new ApiError({ statusCode: 400, code: 'SOMETHING_NEW', message: 'Rejected', details: ['licence number is required'] }),
      ),
    ).toBe('licence number is required');
    expect(describeApiError(new TypeError('fetch failed'))).toMatch(/Cannot reach the SavariGo API/);
    expect(describeApiError('nope')).toBe('Something went wrong.');
  });
});

describe('refresh rotation', () => {
  it('spends one refresh token for concurrent 401s and replays both requests', async () => {
    const store = await signedInStore();
    const calls: Call[] = [];
    let refreshCalls = 0;

    const client = createApiClient({
      baseUrl: BASE_URL,
      store,
      fetchImpl: async (url, init) => {
        const path = String(url).slice(BASE_URL.length);
        const authorization = (init?.headers as Record<string, string>).authorization;
        if (path === '/auth/refresh') {
          refreshCalls += 1;
          return jsonResponse(200, {
            tokenType: 'Bearer',
            accessToken: 'fresh-access',
            refreshToken: 'fresh-refresh',
            expiresIn: 900,
            refreshExpiresIn: 604_800,
            user: USER,
          });
        }
        calls.push({ path, method: 'GET', ...(authorization ? { authorization } : {}), headers: {} });
        return authorization === 'Bearer fresh-access'
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'Sign in to continue.' });
      },
    });

    await expect(Promise.all([client.request('/bookings/a'), client.request('/bookings/b')])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);

    expect(refreshCalls).toBe(1);
    const withToken = (token: string) =>
      calls
        .filter((call) => call.authorization === token)
        .map((call) => call.path)
        .sort();
    expect(withToken('Bearer old-access')).toEqual(['/bookings/a', '/bookings/b']);
    expect(withToken('Bearer fresh-access')).toEqual(['/bookings/a', '/bookings/b']);
    await expect(store.load()).resolves.toMatchObject({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh' });
  });

  it('clears the session when the refresh is refused and surfaces the original 401', async () => {
    const store = await signedInStore();
    const client = createApiClient({
      baseUrl: BASE_URL,
      store,
      fetchImpl: async (url) =>
        String(url).endsWith('/auth/refresh')
          ? jsonResponse(401, { statusCode: 401, code: 'REFRESH_TOKEN_REUSED', message: 'Replayed.' })
          : jsonResponse(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'Sign in to continue.' }),
    });

    await expect(client.request('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(store.load()).resolves.toBeNull();
  });

  it('does not try to refresh when nothing is signed in', async () => {
    const calls: Call[] = [];
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: recordingFetch(calls, () => jsonResponse(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'Sign in.' })),
    });

    await expect(client.request('/bookings')).rejects.toMatchObject({ statusCode: 401 });
    expect(calls).toHaveLength(1);
  });
});

describe('requestPaged', () => {
  it('unwraps the list envelope', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: async () => jsonResponse(200, { data: [{ id: 'v_1' }], meta: { page: 2, limit: 1, total: 3, totalPages: 3 } }),
    });

    await expect(client.requestPaged<{ id: string }>('/vehicles', { query: { page: 2 } })).resolves.toEqual({
      items: [{ id: 'v_1' }],
      meta: { page: 2, limit: 1, total: 3, totalPages: 3 },
    });
  });

  it('synthesises meta for endpoints that answer with a bare array', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      store: emptyStore(),
      fetchImpl: async () => jsonResponse(200, [{ id: 'c_1' }, { id: 'c_2' }]),
    });

    await expect(client.requestPaged<{ id: string }>('/categories')).resolves.toEqual({
      items: [{ id: 'c_1' }, { id: 'c_2' }],
      meta: { page: 1, limit: 2, total: 2, totalPages: 1 },
    });
  });
});

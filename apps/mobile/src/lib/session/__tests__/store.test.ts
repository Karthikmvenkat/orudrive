import { createSessionStore, memoryBackend, type TokenBackend } from '@/lib/session/store';
import type { SessionUser } from '@/lib/api/types';

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

/**
 * The storage keys stay private to the module, so a test finds its way back to
 * one by looking at the value that was written under it.
 */
function trackingBackend() {
  const values = new Map<string, string>();
  const backend: TokenBackend = {
    read: (key) => Promise.resolve(values.get(key) ?? null),
    write: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      values.delete(key);
      return Promise.resolve();
    },
  };
  const keyHolding = (value: string) => [...values.entries()].find(([, stored]) => stored === value)?.[0];
  return { backend, values, keyHolding };
}

describe('session store', () => {
  it('has no session until both tokens are stored', async () => {
    const store = createSessionStore(memoryBackend());
    await expect(store.load()).resolves.toBeNull();

    await store.save({ accessToken: 'a', refreshToken: 'b' });
    await expect(store.load()).resolves.toEqual({ accessToken: 'a', refreshToken: 'b', user: null });
  });

  it('round-trips the profile the sign-in response carries', async () => {
    const store = createSessionStore(memoryBackend());
    await store.save({ accessToken: 'a', refreshToken: 'b', user: USER });

    await expect(store.load()).resolves.toEqual({ accessToken: 'a', refreshToken: 'b', user: USER });
  });

  it('removes a stored profile when a later response carries none', async () => {
    const { backend, values, keyHolding } = trackingBackend();
    const store = createSessionStore(backend);
    await store.save({ accessToken: 'a', refreshToken: 'b', user: USER });
    const userKey = keyHolding(JSON.stringify(USER));
    expect(userKey).toBeDefined();

    await store.save({ accessToken: 'c', refreshToken: 'd' });

    expect(values.has(userKey as string)).toBe(false);
    await expect(store.load()).resolves.toMatchObject({ accessToken: 'c', user: null });
  });

  it('treats a corrupt profile as no profile rather than losing the tokens', async () => {
    const { backend, values, keyHolding } = trackingBackend();
    const store = createSessionStore(backend);
    await store.save({ accessToken: 'a', refreshToken: 'b', user: USER });
    values.set(keyHolding(JSON.stringify(USER)) as string, '{ not json');

    await expect(store.load()).resolves.toEqual({ accessToken: 'a', refreshToken: 'b', user: null });
  });

  it('rewrites only the access token when a refresh hands back one', async () => {
    const { backend, values, keyHolding } = trackingBackend();
    const store = createSessionStore(backend);
    await store.save({ accessToken: 'a', refreshToken: 'b', user: USER });
    const accessKey = keyHolding('a');
    const keyCount = values.size;

    await store.setAccessToken('rotated');

    expect(values.size).toBe(keyCount);
    expect(values.get(accessKey as string)).toBe('rotated');
    await expect(store.load()).resolves.toMatchObject({ accessToken: 'rotated', refreshToken: 'b' });
  });

  it('clears every key on sign-out', async () => {
    const { backend, values } = trackingBackend();
    const store = createSessionStore(backend);
    await store.save({ accessToken: 'a', refreshToken: 'b', user: USER });
    expect(values.size).toBeGreaterThan(0);

    await store.clear();

    expect(values.size).toBe(0);
    await expect(store.load()).resolves.toBeNull();
  });
});

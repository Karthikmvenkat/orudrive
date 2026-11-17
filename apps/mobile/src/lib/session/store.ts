import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ApiAuthResponse, SessionUser } from '@/lib/api/types';

const ACCESS_KEY = 'savarigo.session.access';
const REFRESH_KEY = 'savarigo.session.refresh';
const USER_KEY = 'savarigo.session.user';

export type TokenBackend = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

const memoryStore = new Map<string, string>();

/**
 * Keychain on iOS, Keystore on Android. Both are unavailable on `expo export -p web`,
 * so the web target keeps the session in memory only — enough to click through
 * the flows during development, and it refuses to write a token to
 * `localStorage`, which any injected script on the page could read.
 */
export const secureBackend: TokenBackend = {
  async read(key) {
    if (Platform.OS === 'web') return memoryStore.get(key) ?? null;
    return (await SecureStore.getItemAsync(key)) ?? null;
  },
  async write(key, value) {
    if (Platform.OS === 'web') {
      memoryStore.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (Platform.OS === 'web') {
      memoryStore.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** Test seam: a backend that never touches native storage. */
export function memoryBackend(initial: Record<string, string | null> = {}): TokenBackend {
  const store = new Map(Object.entries(initial));
  return {
    async read(key) {
      return store.get(key) ?? null;
    },
    async write(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    },
  };
}

export type PersistedSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser | null;
};

export type SessionStore = {
  load(): Promise<PersistedSession | null>;
  save(auth: Pick<ApiAuthResponse, 'accessToken' | 'refreshToken'> & { user?: SessionUser | null }): Promise<PersistedSession>;
  setAccessToken(accessToken: string): Promise<void>;
  clear(): Promise<void>;
};

export function createSessionStore(backend: TokenBackend = secureBackend): SessionStore {
  return {
    async load() {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        backend.read(ACCESS_KEY),
        backend.read(REFRESH_KEY),
        backend.read(USER_KEY),
      ]);
      if (!accessToken || !refreshToken) return null;

      let user: SessionUser | null = null;
      if (rawUser) {
        try {
          user = JSON.parse(rawUser) as SessionUser;
        } catch {
          // A corrupt cache entry is not worth logging the customer out over.
          user = null;
        }
      }
      return { accessToken, refreshToken, user };
    },

    async save(auth) {
      const user = auth.user ?? null;
      await Promise.all([
        backend.write(ACCESS_KEY, auth.accessToken),
        backend.write(REFRESH_KEY, auth.refreshToken),
        user ? backend.write(USER_KEY, JSON.stringify(user)) : backend.remove(USER_KEY),
      ]);
      return { accessToken: auth.accessToken, refreshToken: auth.refreshToken, user };
    },

    async setAccessToken(accessToken) {
      await backend.write(ACCESS_KEY, accessToken);
    },

    async clear() {
      await Promise.all([
        backend.remove(ACCESS_KEY),
        backend.remove(REFRESH_KEY),
        backend.remove(USER_KEY),
      ]);
    },
  };
}

export const sessionStore = createSessionStore();

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { accountApi, authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { ApiMe, RoleName, SessionUser } from '@/lib/api/types';
import { sessionStore } from '@/lib/session/store';

type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  city?: string;
};

type SessionContextValue = {
  status: SessionStatus;
  /** Cached user for a signed-in session; `null` while loading or signed out. */
  user: SessionUser | null;
  me: ApiMe | null;
  error: string | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signInWithPhone: (input: { phone: string; code: string }) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasRole: (...roles: RoleName[]) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [me, setMe] = useState<ApiMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const hydrate = useCallback(async () => {
    const session = await sessionStore.load();
    if (!session) {
      if (mounted.current) setStatus('signed-out');
      return;
    }

    // Tokens are only half a promise: the account may have been deactivated or
    // the roles may have changed since the app was last opened.
    try {
      const identity = await accountApi.me();
      if (!mounted.current) return;
      setMe(identity);
      setUser({
        id: identity.id,
        email: identity.email,
        phone: identity.phone,
        status: identity.status,
        emailVerifiedAt: identity.emailVerifiedAt,
        fullName: identity.customerProfile?.fullName ?? null,
        roles: identity.roles,
        createdAt: identity.createdAt,
      });
      setStatus('signed-in');
    } catch (cause) {
      if (!mounted.current) return;
      // A 401 the client could not refresh means the session is genuinely over.
      if (cause instanceof ApiError && (cause.statusCode === 401 || cause.statusCode === 403)) {
        await sessionStore.clear();
        setUser(null);
        setMe(null);
        setStatus('signed-out');
        return;
      }
      // Any other failure is a network problem, not a signed-out user.
      setError(messageFor(cause));
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    setError(null);
    const session = await authApi.login(input);
    await sessionStore.save({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    });
    if (!mounted.current) return;
    setUser(session.user);
    const identity = await accountApi.me().catch(() => null);
    if (mounted.current) {
      setMe(identity);
      setStatus('signed-in');
    }
  }, []);

  const signInWithPhone = useCallback(async (input: { phone: string; code: string }) => {
    setError(null);
    const session = await authApi.verifyPhoneCode(input);
    await sessionStore.save({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    });
    if (!mounted.current) return;
    setUser(session.user);
    const identity = await accountApi.me().catch(() => null);
    if (mounted.current) {
      setMe(identity);
      setStatus('signed-in');
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    setError(null);
    await authApi.register(input);
  }, []);

  const signOut = useCallback(async () => {
    const session = await sessionStore.load();
    if (session?.refreshToken) {
      // Revoking the rotated token server-side is best effort: a stale token
      // means nothing to the app, and a failed call must not trap the user in.
      await authApi.logout(session.refreshToken).catch(() => undefined);
    }
    await sessionStore.clear();
    if (!mounted.current) return;
    setUser(null);
    setMe(null);
    setError(null);
    setStatus('signed-out');
  }, []);

  const refreshMe = useCallback(async () => {
    const identity = await accountApi.me();
    if (!mounted.current) return;
    setMe(identity);
  }, []);

  const hasRole = useCallback(
    (...roles: RoleName[]) => {
      const held = new Set(user?.roles ?? []);
      return roles.some((role) => held.has(role));
    },
    [user?.roles],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, me, error, signIn, signInWithPhone, signUp, signOut, refreshMe, hasRole }),
    [status, user, me, error, signIn, signInWithPhone, signUp, signOut, refreshMe, hasRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>.');
  return context;
}

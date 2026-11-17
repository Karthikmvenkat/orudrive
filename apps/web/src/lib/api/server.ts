import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";
import { apiRequest, ApiError } from "./http";
import type { ApiMe, RoleName } from "./types";

export async function readAuthCookies(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_COOKIE)?.value ?? null,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const { accessToken } = await readAuthCookies();
  return accessToken;
}

export async function getSessionUser(): Promise<ApiMe | null> {
  const { accessToken } = await readAuthCookies();
  if (!accessToken) return null;
  try {
    return await apiRequest<ApiMe>("/users/me", {
      token: accessToken,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/**
 * Server components use this after middleware has refreshed the access token.
 * If the session still cannot be read we bounce through the BFF session
 * refresher before falling back to the login screen.
 */
export async function requireUser(
  roles?: RoleName[],
  nextPath = "/dashboard",
): Promise<ApiMe> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/api/auth/refresh-session?next=${encodeURIComponent(nextPath)}`);
  }
  if (roles && !user.roles.some((role) => roles.includes(role))) {
    redirect("/dashboard");
  }
  return user;
}

async function requestWithLogin<T>(
  path: string,
  options: Parameters<typeof apiRequest<T>>[1],
  nextPath: string,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) redirect(`/login?next=${nextPath}`);
  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${nextPath}`);
    }
    throw error;
  }
}

export async function staffRequest<T>(
  path: string,
  options: Parameters<typeof apiRequest<T>>[1] = {},
): Promise<T> {
  return requestWithLogin<T>(path, options, "/admin");
}

export async function vendorRequest<T>(
  path: string,
  options: Parameters<typeof apiRequest<T>>[1] = {},
): Promise<T> {
  return requestWithLogin<T>(path, options, "/partner");
}

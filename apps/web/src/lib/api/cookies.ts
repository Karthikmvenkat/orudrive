import type { NextResponse } from "next/server";
import { AUTH_COOKIE_OPTIONS, ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";
import { apiRequest } from "./http";
import type { ApiAuthResponse } from "./types";

type TokenPair = Pick<
  ApiAuthResponse,
  "accessToken" | "refreshToken" | "expiresIn" | "refreshExpiresIn"
>;

export function applyAuthCookies(response: NextResponse, tokens: TokenPair): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: tokens.refreshExpiresIn,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
}

export async function requestTokenRefresh(
  refreshToken: string,
): Promise<ApiAuthResponse | null> {
  try {
    return await apiRequest<ApiAuthResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export function safeNextPath(value: string | null, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}

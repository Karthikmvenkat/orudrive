import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  clearAuthCookies,
  requestTokenRefresh,
} from "@/lib/api/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/constants";
import { ApiError, apiRequest } from "@/lib/api/http";
import { apiErrorResponse } from "@/lib/api/route-utils";
import { isJwtExpired } from "@/lib/api/jwt";
import type { ApiAuthResponse, ApiMe } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  let accessToken = store.get(ACCESS_COOKIE)?.value ?? null;
  let refreshed: ApiAuthResponse | null = null;

  if (!accessToken || isJwtExpired(accessToken)) {
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (refreshToken) refreshed = await requestTokenRefresh(refreshToken);
    if (!refreshed) {
      // Being signed out is a normal state for a visitor, not an error: the
      // session provider runs on every page and a 401 here shows up as a
      // console error on every anonymous page view.
      const response = NextResponse.json({ user: null });
      clearAuthCookies(response);
      return response;
    }
    accessToken = refreshed.accessToken;
  }

  try {
    const user = await apiRequest<ApiMe>("/users/me", {
      token: accessToken,
      cache: "no-store",
    });
    const response = NextResponse.json({ user });
    if (refreshed) applyAuthCookies(response, refreshed);
    return response;
  } catch (error) {
    const response = apiErrorResponse(error);
    if (error instanceof ApiError && error.status === 401) clearAuthCookies(response);
    return response;
  }
}

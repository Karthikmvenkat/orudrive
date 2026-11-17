import { type NextRequest, NextResponse } from "next/server";
import {
  applyAuthCookies,
  clearAuthCookies,
  requestTokenRefresh,
  safeNextPath,
} from "@/lib/api/cookies";
import { REFRESH_COOKIE } from "@/lib/api/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, request.url),
    );
  }

  const tokens = await requestTokenRefresh(refreshToken);
  if (!tokens) {
    const response = NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, request.url),
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  applyAuthCookies(response, tokens);
  return response;
}

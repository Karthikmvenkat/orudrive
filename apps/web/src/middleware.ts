import { type NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/constants";
import { decodeJwtPayload, isJwtExpired } from "@/lib/api/jwt";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/partner"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const nextPath = `${pathname}${search}`;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url),
    );
  }

  if (!accessToken || isJwtExpired(accessToken)) {
    const refreshUrl = new URL("/api/auth/refresh-session", request.url);
    refreshUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(refreshUrl);
  }

  const roles = decodeJwtPayload(accessToken)?.roles ?? [];

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!roles.includes("ADMIN") && !roles.includes("SUPPORT")) {
      return NextResponse.redirect(
        roles.includes("VENDOR") ? new URL("/partner", request.url) : new URL("/dashboard", request.url),
      );
    }
  }

  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    if (!roles.includes("VENDOR")) {
      return NextResponse.redirect(
        roles.includes("ADMIN") || roles.includes("SUPPORT")
          ? new URL("/admin", request.url)
          : new URL("/dashboard", request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/partner/:path*"],
};

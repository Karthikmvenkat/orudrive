import { type NextRequest, NextResponse } from "next/server";
import { applyAuthCookies, clearAuthCookies, requestTokenRefresh } from "@/lib/api/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/constants";
import { ApiError, apiRequest, type ApiRequestOptions } from "@/lib/api/http";
import { apiErrorResponse } from "@/lib/api/route-utils";

const ALLOWED_ROOTS = new Set([
  "users",
  "customers",
  "bookings",
  "payments",
  "reviews",
  "notifications",
  "coupons",
  "drivers",
  "partners",
  "admin",
  "availability",
  "pricing",
  "vehicles",
  "categories",
  "locations",
]);

type Method = NonNullable<ApiRequestOptions["method"]>;
type RouteContext = { params: Promise<{ path: string[] }> };

function isUnsafeSegment(segment: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // A sequence that cannot be decoded is not a route anyone meant to call.
    return true;
  }
  return decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\");
}

export const dynamic = "force-dynamic";

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (!path?.length || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json(
      { statusCode: 404, code: "PROXY_ROUTE_NOT_ALLOWED", message: "Unknown API route" },
      { status: 404 },
    );
  }
  // `%2e%2e%2f` arrives as one encoded segment here, and the fetch that follows
  // would decode it into `..` and walk out of the /api/v1 prefix — past this
  // allowlist. So each segment is decoded before it is judged.
  if (path.some(isUnsafeSegment)) {
    return NextResponse.json(
      { statusCode: 400, code: "PROXY_PATH_INVALID", message: "Malformed API route" },
      { status: 400 },
    );
  }

  const method = request.method as Method;
  let body: unknown;
  if (method !== "GET") {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { statusCode: 400, code: "INVALID_JSON", message: "Request body must be JSON" },
          { status: 400 },
        );
      }
    }
  }

  const target = `/${path.join("/")}${request.nextUrl.search}`;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value ?? null;

  const send = (token: string | null) =>
    apiRequest<unknown>(target, { method, body, token, cache: "no-store" });

  let data: unknown;
  let rotated: Awaited<ReturnType<typeof requestTokenRefresh>> = null;

  try {
    data = await send(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && refreshToken) {
      rotated = await requestTokenRefresh(refreshToken);
      if (!rotated) {
        const response = apiErrorResponse(error);
        clearAuthCookies(response);
        return response;
      }
      accessToken = rotated.accessToken;
      try {
        data = await send(accessToken);
      } catch (retryError) {
        return apiErrorResponse(retryError);
      }
    } else {
      return apiErrorResponse(error);
    }
  }

  const response = NextResponse.json(data ?? { success: true });
  if (rotated) applyAuthCookies(response, rotated);
  return response;
}

export {
  forward as GET,
  forward as POST,
  forward as PATCH,
  forward as PUT,
  forward as DELETE,
};

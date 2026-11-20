import { type NextRequest, NextResponse } from "next/server";
import { applyAuthCookies, clearAuthCookies, requestTokenRefresh } from "@/lib/api/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/constants";
import { apiUrl } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ statusCode: status, code, message }, { status });
}

function send(token: string | null, id: string): Promise<Response> {
  return fetch(apiUrl(`documents/${id}/file`), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
}

/**
 * The generic `/api/proxy` route answers with `NextResponse.json`, so a stored
 * certificate could not travel through it. This handler keeps the bytes intact
 * and lets the API decide who may see them: Master Admin and Support get every
 * document, a partner only their own.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return failure(404, "DOCUMENT_NOT_FOUND", "Unknown document");
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value ?? null;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value ?? null;

  let upstream = await send(accessToken, id);
  let rotated: Awaited<ReturnType<typeof requestTokenRefresh>> = null;

  if (upstream.status === 401 && refreshToken) {
    rotated = await requestTokenRefresh(refreshToken);
    if (!rotated) {
      const response = failure(401, "UNAUTHENTICATED", "Sign in again to open this file");
      clearAuthCookies(response);
      return response;
    }
    accessToken = rotated.accessToken;
    upstream = await send(accessToken, id);
  }

  if (upstream.status === 401) {
    const response = failure(401, "UNAUTHENTICATED", "Sign in to open this file");
    clearAuthCookies(response);
    return response;
  }
  if (upstream.status === 403) {
    return failure(403, "DOCUMENT_FORBIDDEN", "That document belongs to someone else");
  }
  if (upstream.status === 404) {
    return failure(404, "DOCUMENT_FILE_UNAVAILABLE", "No stored copy of that document");
  }
  if (!upstream.ok) {
    return failure(502, "DOCUMENT_FILE_UNAVAILABLE", "The document could not be read");
  }

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: 200,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? "inline",
      "cache-control": "private, no-store",
    },
  });
  if (rotated) applyAuthCookies(response, rotated);
  return response;
}

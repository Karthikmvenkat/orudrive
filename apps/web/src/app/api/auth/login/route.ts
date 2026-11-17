import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/api/cookies";
import { apiRequest } from "@/lib/api/http";
import { apiErrorResponse, readJson } from "@/lib/api/route-utils";
import type { ApiAuthResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { statusCode: 400, code: "INVALID_BODY", message: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    const tokens = await apiRequest<ApiAuthResponse>("/auth/login", {
      method: "POST",
      body: { email: body.email, password: body.password },
      cache: "no-store",
    });
    const response = NextResponse.json({ user: tokens.user });
    applyAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

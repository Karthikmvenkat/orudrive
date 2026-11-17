import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/http";
import { apiErrorResponse, readJson } from "@/lib/api/route-utils";
import type { ApiRegisterResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = await readJson<Record<string, unknown>>(request);
  if (!body) {
    return NextResponse.json(
      { statusCode: 400, code: "INVALID_BODY", message: "Registration details are required" },
      { status: 400 },
    );
  }

  try {
    const result = await apiRequest<ApiRegisterResponse>("/auth/register", {
      method: "POST",
      body,
      cache: "no-store",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

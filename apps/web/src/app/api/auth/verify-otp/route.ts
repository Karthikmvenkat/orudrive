import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/http";
import { apiErrorResponse, readJson } from "@/lib/api/route-utils";
import type { ApiOtpVerificationResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = await readJson<Record<string, unknown>>(request);
  if (!body) {
    return NextResponse.json(
      { statusCode: 400, code: "INVALID_BODY", message: "Verification details are required" },
      { status: 400 },
    );
  }

  try {
    const result = await apiRequest<ApiOtpVerificationResponse>("/auth/verify-otp", {
      method: "POST",
      body,
      cache: "no-store",
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

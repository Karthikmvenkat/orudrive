import { NextResponse } from "next/server";
import { ApiError } from "./http";

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        statusCode: error.status,
        ...(error.code ? { code: error.code } : {}),
        message: error.message,
      },
      { status: error.status },
    );
  }
  console.error("[web/api]", error);
  return NextResponse.json(
    { statusCode: 500, code: "WEB_GATEWAY_ERROR", message: "Something went wrong" },
    { status: 500 },
  );
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

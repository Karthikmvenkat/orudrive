import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/api/cookies";
import { REFRESH_COOKIE } from "@/lib/api/constants";
import { apiRequest } from "@/lib/api/http";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: { refreshToken },
        cache: "no-store",
      });
    } catch {
      // The session is being discarded locally regardless.
    }
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}

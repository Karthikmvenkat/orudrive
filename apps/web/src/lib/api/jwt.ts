export interface DecodedJwt {
  sub?: string;
  email?: string;
  roles?: string[];
  type?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): DecodedJwt | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewMs = 5_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewMs;
}

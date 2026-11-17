import type { Request } from "express";

/**
 * Rate limits and audit rows have to key on the address Express resolved, not
 * on the first `x-forwarded-for` entry: that header is free to forge whenever
 * the server is not behind a proxy, which would let a caller step around the
 * throttler and sign the audit log with somebody else's address. `main.ts`
 * decides whether the header is honoured, through TRUST_PROXY_HOPS.
 */
export function clientIp(request: Request): string | null {
  return request.ip || request.socket.remoteAddress || null;
}

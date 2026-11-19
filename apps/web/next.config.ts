import type { NextConfig } from "next";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";

/** Where the browser may reach for XHR/fetch: this origin plus the API origin. */
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const razorpayOrigins = ["https://checkout.razorpay.com", "https://api.razorpay.com"];

/**
 * A document policy has to be written for the scripts the site really loads:
 * Razorpay's checkout is a third-party script that opens a third-party frame,
 * and Tailwind styles arrive as inline `style` attributes. `unsafe-eval` is
 * dev-only — Turbopack's hot reload needs it, and the deployed bundle does not.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} ${razorpayOrigins[0]}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} ${razorpayOrigins.join(" ")}${
    isProduction ? "" : " ws: wss:"
  }`,
  `frame-src ${razorpayOrigins.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // Meaningless over plain http and cached aggressively by browsers, so it is
  // only sent once the site is really being served over HTTPS.
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The booking tokens are httpOnly cookies; nothing cached may carry them.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;

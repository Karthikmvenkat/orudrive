/**
 * Fails fast when a required variable is missing. Production JWT secrets must
 * be supplied; development gets a clear warning instead of silently using a
 * weak default.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const isProduction = config.NODE_ENV === "production";

  if (!config.DATABASE_URL) errors.push("DATABASE_URL is required");

  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = config[key];
    if (isProduction) {
      if (typeof value !== "string" || value.length < 32) {
        errors.push(`${key} must be at least 32 characters in production`);
      }
      if (typeof value === "string" && value.includes("replace-with")) {
        errors.push(`${key} still contains the example placeholder`);
      }
    } else if (!value) {
      // eslint-disable-next-line no-console
      console.warn(`[config] ${key} is not set; development default will be used`);
    }
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535");
  }

  if (isProduction && config.PAYMENT_PROVIDER === "razorpay") {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      errors.push("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for Razorpay");
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }

  return config;
}

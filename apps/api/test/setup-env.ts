process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ??
  "postgresql://test:test@127.0.0.1:5432/savari_test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-access-secret-0123456789abcdef0123456789abcdef";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  "test-refresh-secret-0123456789abcdef0123456789abcdef";
process.env.AUTH_DEBUG_OTP = process.env.AUTH_DEBUG_OTP ?? "true";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? "http://localhost:3000";

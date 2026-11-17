export const ACCESS_COOKIE = "sg_access";
export const REFRESH_COOKIE = "sg_refresh";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

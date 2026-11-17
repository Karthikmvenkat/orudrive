export const ROLES = {
  CUSTOMER: "CUSTOMER",
  DRIVER: "DRIVER",
  VENDOR: "VENDOR",
  SUPPORT: "SUPPORT",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: RoleName[] = [ROLES.ADMIN, ROLES.SUPPORT];

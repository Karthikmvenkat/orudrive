import { Prisma } from "@prisma/client";

/**
 * `vehicle_availability_no_overlap` is a GiST exclusion constraint, so the
 * database — not the application — is what refuses a second reservation of a
 * window two riders tried to take at the same instant. Prisma reports it as a
 * raw error, which would reach the rider as a 500; the booking services turn it
 * into the same 409 their own pre-check produces.
 */
export function isOverlapViolation(error: unknown): boolean {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `${error.message} ${JSON.stringify(error.meta ?? {})}`
      : error instanceof Error
        ? error.message
        : "";
  return (
    message.includes("vehicle_availability_no_overlap") ||
    message.includes("exclusion constraint")
  );
}

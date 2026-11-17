import { PrismaClient, AvailabilityStatus } from "@prisma/client";
import { isOverlapViolation } from "../src/common/utils/overlap-violation";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

/**
 * The database-level half of booking scenario 1 (two riders, one vehicle).
 *
 * The application pre-check is polite; the GiST exclusion constraint is what is
 * actually true under concurrency. If a deployment rebuilt its schema with
 * `prisma db push` the constraint disappears silently and the pre-check alone
 * decides who gets the vehicle — these tests fail loudly in that case.
 */
describeWithDatabase("Availability overlap guard (integration)", () => {
  const prisma = new PrismaClient();
  let vehicleId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const vehicle = await prisma.vehicle.findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (!vehicle) throw new Error("No vehicle to anchor the overlap tests");
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    if (createdIds.length) {
      await prisma.vehicleAvailability.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  /** Far-future windows so the seeded calendar cannot collide with these rows. */
  const window = (offsetDays: number, lengthDays = 3) => ({
    startsAt: new Date(Date.UTC(2031, 0, 1 + offsetDays)),
    endsAt: new Date(Date.UTC(2031, 0, 1 + offsetDays + lengthDays)),
  });

  async function reserve(
    status: AvailabilityStatus,
    range: { startsAt: Date; endsAt: Date },
  ) {
    const row = await prisma.vehicleAvailability.create({
      data: { vehicleId, status, ...range, note: "overlap-guard test" },
      select: { id: true },
    });
    createdIds.push(row.id);
    return row;
  }

  it("refuses a second reservation of a window that is already booked", async () => {
    const held = window(40);
    await reserve(AvailabilityStatus.BOOKED, held);

    const error = await reserve(AvailabilityStatus.BOOKED, {
      startsAt: new Date(held.startsAt.getTime() + 86_400_000),
      endsAt: new Date(held.endsAt.getTime() + 86_400_000),
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("vehicle_availability_no_overlap");
    // The message the services switch on is the one Prisma actually raises.
    expect(isOverlapViolation(error)).toBe(true);
  });

  it("lets a window that merely touches the boundary through", async () => {
    const held = window(60);
    await reserve(AvailabilityStatus.BLOCKED, held);

    // tsrange is '[)', so an endsAt equal to the next startsAt does not overlap.
    const adjacent = await reserve(AvailabilityStatus.BOOKED, {
      startsAt: held.endsAt,
      endsAt: new Date(held.endsAt.getTime() + 86_400_000),
    });
    expect(adjacent.id).toBeTruthy();
  });

  it("ignores statuses that do not reserve the vehicle", async () => {
    const held = window(80);
    await reserve(AvailabilityStatus.BOOKED, held);
    const free = await reserve(AvailabilityStatus.AVAILABLE, held);
    expect(free.id).toBeTruthy();
  });

  it("treats an unrelated database error as something else", () => {
    // The Prisma branch is covered by the real rejection above; this pins down
    // that the predicate is a constraint match rather than a catch-all.
    expect(isOverlapViolation(new Error("Transaction failed after retry limit"))).toBe(false);
    expect(isOverlapViolation(undefined)).toBe(false);
  });
});

import { Injectable } from "@nestjs/common";
import { BookingStatus, VehicleStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { ReportQueryDto, ReportGroup } from "./reports.dto";

const NOT_REVENUE: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.NO_SHOW];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: ReportQueryDto) {
    const group: ReportGroup = query.group ?? "day";
    const to = new Date();
    const from = shiftDays(startOfDay(to), -(query.days - 1));

    const [bookingRows, vendorProfiles, vehicleGroups, counts, refunds] =
      await Promise.all([
        this.prisma.booking.findMany({
          where: {
            OR: [{ createdAt: { gte: from } }, { payments: { some: { paidAt: { gte: from } } } }],
          },
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            totalAmount: true,
            pickupLocation: { select: { city: true, name: true } },
            vehicle: {
              select: {
                id: true,
                name: true,
                slug: true,
                rating: true,
                ownerId: true,
                category: { select: { name: true } },
              },
            },
            payments: { select: { amount: true, paidAt: true } },
          },
        }),
        this.prisma.vendorProfile.findMany({
          select: {
            id: true,
            userId: true,
            partnerCode: true,
            tradingName: true,
            city: true,
            status: true,
            commissionPercent: true,
          },
        }),
        this.prisma.vehicle.groupBy({
          by: ["ownerId", "status"],
          _count: { _all: true },
        }),
        this.prisma.$transaction([
          this.prisma.vehicle.count(),
          this.prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
          this.prisma.customerProfile.count(),
          this.prisma.driverProfile.count(),
        ]),
        this.prisma.refund.aggregate({
          where: { createdAt: { gte: from }, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);

    const [vehiclesTotal, vehiclesAvailable, customers, drivers] = counts;
    const inWindow = bookingRows.filter(
      (booking) => booking.createdAt.getTime() >= from.getTime(),
    );

    const series = new Map<string, { bookings: number; collected: number }>();
    for (
      let cursor = bucketStart(from, group);
      cursor.getTime() <= to.getTime();
      cursor = nextBucket(cursor, group)
    ) {
      series.set(bucketKey(cursor, group), { bookings: 0, collected: 0 });
    }

    const cities = new Map<string, { bookings: number; collected: number; vehicles: Set<string> }>();
    const partners = new Map<
      string,
      { bookings: number; collected: number; open: number }
    >();
    const vehicles = new Map<string, { name: string; slug: string; bookings: number; collected: number; rating: number }>();
    const categories = new Map<string, { bookings: number; collected: number }>();

    let collected = 0;
    let rentalValue = 0;
    let cancelled = 0;

    for (const booking of bookingRows) {
      const countsInWindow =
        booking.createdAt.getTime() >= from.getTime();
      const bookingCollected = booking.payments
        .filter((payment) => payment.paidAt && payment.paidAt >= from)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      if (countsInWindow) {
        const bucket = series.get(bucketKey(booking.createdAt, group));
        if (bucket) bucket.bookings += 1;
      }
      collected += bookingCollected;
      if (!NOT_REVENUE.includes(booking.status)) {
        rentalValue += Number(booking.totalAmount);
      }
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.NO_SHOW
      ) {
        cancelled += 1;
      }

      const city = booking.pickupLocation.city;
      const cityEntry = cities.get(city) ?? { bookings: 0, collected: 0, vehicles: new Set<string>() };
      if (countsInWindow) cityEntry.bookings += 1;
      cityEntry.collected += bookingCollected;
      cityEntry.vehicles.add(booking.vehicle.id);
      cities.set(city, cityEntry);

      const partnerKey = booking.vehicle.ownerId;
      const partnerEntry = partners.get(partnerKey) ?? {
        bookings: 0,
        collected: 0,
        open: 0,
      };
      if (countsInWindow) partnerEntry.bookings += 1;
      partnerEntry.collected += bookingCollected;
      // A payout is only earned once the rental closes; money attached to a
      // booking that is still running stays unsettled.
      if (booking.status !== BookingStatus.COMPLETED) {
        partnerEntry.open += bookingCollected;
      }
      partners.set(partnerKey, partnerEntry);

      const vehicleEntry = vehicles.get(booking.vehicle.id) ?? {
        name: booking.vehicle.name,
        slug: booking.vehicle.slug,
        bookings: 0,
        collected: 0,
        rating: Number(booking.vehicle.rating),
      };
      if (countsInWindow) vehicleEntry.bookings += 1;
      vehicleEntry.collected += bookingCollected;
      vehicles.set(booking.vehicle.id, vehicleEntry);

      const categoryName = booking.vehicle.category.name;
      const categoryEntry = categories.get(categoryName) ?? { bookings: 0, collected: 0 };
      if (countsInWindow) categoryEntry.bookings += 1;
      categoryEntry.collected += bookingCollected;
      categories.set(categoryName, categoryEntry);
    }

    const profileByUserId = new Map(
      vendorProfiles.map((profile) => [profile.userId, profile]),
    );
    const fleetByOwner = new Map<string, { vehicles: number; available: number }>();
    for (const row of vehicleGroups) {
      const entry = fleetByOwner.get(row.ownerId) ?? { vehicles: 0, available: 0 };
      entry.vehicles += row._count._all;
      if (row.status === VehicleStatus.AVAILABLE) entry.available += row._count._all;
      fleetByOwner.set(row.ownerId, entry);
    }

    const refunded = Number(refunds._sum.amount ?? 0);

    const settlement = [...partners.entries()].reduce(
      (acc, [ownerId, value]) => {
        const keep =
          1 - Number(profileByUserId.get(ownerId)?.commissionPercent ?? 0) / 100;
        acc.earnings += value.collected * keep;
        acc.unsettled += value.open * keep;
        return acc;
      },
      { earnings: 0, unsettled: 0 },
    );

    return {
      range: { days: query.days, group, from, to },
      settlement: {
        partnerEarnings: round(settlement.earnings),
        platformCommission: round(collected - settlement.earnings),
        pendingSettlement: round(settlement.unsettled),
        settled: round(settlement.earnings - settlement.unsettled),
      },
      totals: {
        bookings: inWindow.length,
        collected: round(collected),
        refunded: round(refunded),
        net: round(collected - refunded),
        rentalValue: round(rentalValue),
        averageBookingValue: round(rentalValue / Math.max(1, inWindow.length)),
        cancelled,
        vehicles: vehiclesTotal,
        availableVehicles: vehiclesAvailable,
        customers,
        drivers,
        partners: vendorProfiles.length,
      },
      series: [...series.entries()].map(([label, value]) => ({
        label,
        bookings: value.bookings,
        collected: round(value.collected),
      })),
      cityPerformance: [...cities.entries()]
        .map(([city, value]) => ({
          city,
          bookings: value.bookings,
          collected: round(value.collected),
          vehicles: value.vehicles.size,
        }))
        .sort((a, b) => b.collected - a.collected),
      partnerPerformance: [...partners.entries()]
        .map(([ownerId, value]) => {
          const profile = profileByUserId.get(ownerId);
          const fleet = fleetByOwner.get(ownerId) ?? { vehicles: 0, available: 0 };
          const commissionPercent = profile
            ? Number(profile.commissionPercent)
            : 0;
          return {
            ownerId,
            partnerCode: profile?.partnerCode ?? null,
            tradingName: profile?.tradingName ?? "Unassigned owner",
            city: profile?.city ?? null,
            status: profile?.status ?? null,
            commissionPercent,
            vehicles: fleet.vehicles,
            available: fleet.available,
            bookings: value.bookings,
            collected: round(value.collected),
            payout: round(value.collected * (1 - commissionPercent / 100)),
            openPayout: round(value.open * (1 - commissionPercent / 100)),
          };
        })
        .sort((a, b) => b.collected - a.collected),
      vehiclePopularity: [...vehicles.values()]
        .sort((a, b) => b.bookings - a.bookings || b.collected - a.collected)
        .slice(0, 10)
        .map((vehicle) => ({
          name: vehicle.name,
          slug: vehicle.slug,
          bookings: vehicle.bookings,
          collected: round(vehicle.collected),
          rating: vehicle.rating,
        })),
      categoryMix: [...categories.entries()]
        .map(([category, value]) => ({
          category,
          bookings: value.bookings,
          collected: round(value.collected),
        }))
        .sort((a, b) => b.bookings - a.bookings),
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Monday-based week start, first of the month, or the day itself. */
function bucketStart(date: Date, group: ReportGroup) {
  const day = startOfDay(date);
  if (group === "month") {
    return new Date(day.getFullYear(), day.getMonth(), 1);
  }
  if (group === "week") {
    return shiftDays(day, -((day.getDay() + 6) % 7));
  }
  return day;
}

function nextBucket(date: Date, group: ReportGroup) {
  const copy = new Date(date);
  if (group === "month") copy.setMonth(copy.getMonth() + 1);
  else if (group === "week") copy.setDate(copy.getDate() + 7);
  else copy.setDate(copy.getDate() + 1);
  return copy;
}

function bucketKey(date: Date, group: ReportGroup) {
  const start = bucketStart(date, group);
  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return group === "month" ? `${yyyy}-${mm}` : `${yyyy}-${mm}-${dd}`;
}

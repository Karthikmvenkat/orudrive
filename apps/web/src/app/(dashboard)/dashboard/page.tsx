import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  ChevronRight,
  CircleDollarSign,
  Heart,
  MapPin,
  Sparkles,
  Ticket,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardHero, Panel } from "@/components/dashboard/ui";
import { BookingStatusBadge } from "@/components/dashboard/status-badge";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { myBookings, myPayments } from "@/lib/api/account";
import { toBooking, toPaymentRecord, toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { getAccessToken, getSessionUser } from "@/lib/api/server";
import { vehicles as fixtures } from "@/lib/data/vehicles";
import { formatDate, inr } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

const quickActions = [
  { label: "Book a bike", description: "Scooters from ₹449/day", href: "/bikes-scooters", icon: Sparkles },
  { label: "Book a car", description: "Self-drive from ₹1,899/day", href: "/cars", icon: CarFront },
  { label: "Hire a driver", description: "Hourly & outstation", href: "/driver-on-demand", icon: UserRound },
  { label: "View offers", description: "Up to 20% off this week", href: "/offers", icon: Ticket },
];

export default async function DashboardPage() {
  const [user, token] = await Promise.all([getSessionUser(), getAccessToken()]);
  if (!user || !token) redirect("/login?next=/dashboard");

  const [apiBookings, apiPayments, apiVehicles] = await Promise.all([
    myBookings(token, 50),
    myPayments(token, 100),
    safeVehicles({ sort: "popular", limit: 4 }),
  ]);

  const bookings = apiBookings.map(toBooking);
  const vehicleNameByCode = new Map(bookings.map((b) => [b.code, b.vehicleName]));
  const payments = apiPayments.map((payment) =>
    toPaymentRecord(
      payment,
      payment.bookingCode ? vehicleNameByCode.get(payment.bookingCode) : undefined,
    ),
  );

  const name = user.customerProfile?.fullName ?? user.email.split("@")[0];
  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
  const completed = bookings.filter((b) => b.status === "completed");
  const paid = payments.filter((payment) => payment.status === "Paid");
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const nextRide = upcoming[0];
  const recent = bookings.slice(0, 3);
  const recommended = apiVehicles.length
    ? apiVehicles.map(toVehicle)
    : fixtures.filter((v) => v.popular).slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      label: "Upcoming rides",
      value: upcoming.length.toString(),
      hint: nextRide ? `Next pickup ${formatDate(nextRide.pickupDate, { day: "2-digit", month: "short" })}` : "Nothing scheduled",
      icon: CalendarDays,
      tint: "bg-mint",
    },
    {
      label: "Completed rides",
      value: completed.length.toString(),
      hint: "Across all your trips",
      icon: Ticket,
      tint: "bg-sky",
    },
    {
      label: "Saved vehicles",
      value: "0",
      hint: "Shortlist coming soon",
      icon: Heart,
      tint: "bg-peach",
    },
    {
      label: "Total spent",
      value: inr(paidTotal),
      hint: `Across ${paid.length} paid bookings`,
      icon: CircleDollarSign,
      tint: "bg-lilac",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting}, ${name.split(" ")[0]}`}
        description="Here's everything happening with your rides this week."
        action={
          <Button asChild>
            <Link href="/bikes-scooters">
              Book a ride <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-panel border border-line bg-surface p-4 transition hover:border-brand-200 hover:shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className={`grid size-9 place-items-center rounded-xl ${stat.tint} text-forest`}>
                <stat.icon className="size-[18px]" strokeWidth={1.9} />
              </span>
              <ArrowUpRight className="size-4 text-line-strong" />
            </div>
            <p className="mt-3 font-display text-[24px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[12px] font-semibold text-ink-soft">{stat.label}</p>
            <p className="text-[11px] text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      {nextRide && (
        <section className="overflow-hidden rounded-panel border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-50/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
              </span>
              <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-brand-800">
                Your next ride
              </p>
            </div>
            <Badge variant="brand" size="md">
              Pickup {formatDate(nextRide.pickupDate, { day: "2-digit", month: "short" })}
            </Badge>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="relative h-32 w-full overflow-hidden rounded-xl bg-page sm:h-24 sm:w-36">
              <Image
                src={nextRide.vehicleImage}
                alt={nextRide.vehicleName}
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-ink">{nextRide.vehicleName}</h2>
                <BookingStatusBadge status={nextRide.status} />
              </div>
              <p className="mt-1 text-[12px] font-medium text-muted">
                Booking <span className="font-bold text-ink-soft">#{nextRide.code}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted" />
                  {formatDate(nextRide.pickupDate)} – {formatDate(nextRide.returnDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted" />
                  {nextRide.pickupLocation}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <div className="text-right">
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted">
                  Amount paid
                </p>
                <p className="font-display text-[18px] font-extrabold text-ink">
                  {inr(nextRide.total)}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/dashboard/bookings/${nextRide.id}`}>
                  View ticket <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Recent bookings"
          action={
            <Link
              href="/dashboard/bookings"
              className="text-[12px] font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {recent.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-page/70"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-page">
                    <Image
                      src={booking.vehicleImage}
                      alt={booking.vehicleName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {booking.vehicleName}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {booking.code} · {formatDate(booking.pickupDate, { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="w-16 text-right text-[13px] font-bold text-ink">
                    {inr(booking.total, { compact: true })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Quick actions">
          <ul className="divide-y divide-line">
            {quickActions.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="group flex items-center gap-3 px-5 py-3 transition hover:bg-page/70"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <action.icon className="size-[17px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink">{action.label}</p>
                    <p className="text-[11px] text-muted">{action.description}</p>
                  </div>
                  <ChevronRight className="size-4 text-line-strong transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="label-overline mb-1">Picked for you</p>
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Recommended rides
            </h2>
          </div>
          <Link
            href="/cars"
            className="text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Browse all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock,
  CreditCard,
  Fuel,
  Gauge,
  MapPin,
  Milestone,
  Phone,
  Settings2,
  Shield,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardHero, Crumb, Panel } from "@/components/dashboard/ui";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { BookingDetailActions } from "@/components/dashboard/booking-detail-actions";
import { myBooking } from "@/lib/api/account";
import { toBooking } from "@/lib/api/adapters";
import { safeVehicle } from "@/lib/api/catalogue";
import { getAccessToken } from "@/lib/api/server";
import { formatDate, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking details" };

const steps = [
  { key: "booked", label: "Booked", note: "Payment confirmed" },
  { key: "confirmed", label: "Confirmed", note: "Vehicle reserved" },
  { key: "picked", label: "Picked up", note: "Handover at hub" },
  { key: "returned", label: "Returned", note: "Deposit released" },
];

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getAccessToken();
  if (!token) redirect(`/login?next=/dashboard/bookings/${id}`);
  const apiBooking = await myBooking(token, id);
  if (!apiBooking) notFound();

  const booking = toBooking(apiBooking);
  const vehicle = await safeVehicle(apiBooking.vehicle.slug);
  const completedSteps =
    booking.status === "completed"
      ? 4
      : apiBooking.status === "ONGOING"
        ? 3
        : 2;
  const pickupTime = new Date(apiBooking.pickupAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const returnTime = new Date(apiBooking.returnAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 text-[12px] text-muted">
        <Crumb href="/dashboard">Dashboard</Crumb>
        <Crumb href="/dashboard/bookings">My bookings</Crumb>
        <span className="font-semibold text-ink-soft">{booking.code}</span>
      </div>

      <DashboardHero
        eyebrow={`Booking #${booking.code}`}
        title={booking.vehicleName}
        description={`${formatDate(booking.pickupDate)} – ${formatDate(booking.returnDate)} · ${booking.duration} ${
          booking.duration === 1 ? "day" : "days"
        }`}
        action={<BookingStatusBadge status={booking.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Panel title="Ride status">
            <div className="px-5 py-6">
              {booking.status === "cancelled" ? (
                <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
                  <p className="text-[13px] font-bold text-danger">Booking cancelled</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                    {apiBooking.cancellationReason
                      ? `${apiBooking.cancellationReason}. `
                      : ""}
                    Any eligible refund is returned to the original payment method within
                    3–5 working days.
                  </p>
                </div>
              ) : (
                <ol className="relative grid gap-6 sm:grid-cols-4 sm:gap-3">
                  <div
                    className="absolute left-5 top-4 h-[calc(100%-2rem)] w-0.5 bg-line sm:left-4 sm:right-4 sm:top-4 sm:h-0.5 sm:w-auto"
                    aria-hidden
                  />
                  {steps.map((step, i) => {
                    const done = i < completedSteps;
                    const current = i === completedSteps - 1;
                    return (
                      <li key={step.key} className="relative flex gap-3 sm:flex-col sm:gap-2">
                        <span
                          className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold transition ${
                            done
                              ? "border-brand-500 bg-brand-500 text-ink"
                              : "border-line-strong bg-white text-muted"
                          }`}
                        >
                          {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                        </span>
                        <div>
                          <p
                            className={`text-[12.5px] font-bold ${
                              done ? "text-ink" : "text-muted"
                            }`}
                          >
                            {step.label}
                            {current && (
                              <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-brand-700">
                                Now
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted">{step.note}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Panel>

          <Panel title="Trip details">
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-page sm:h-[104px] sm:w-[140px]">
                  <Image
                    src={booking.vehicleImage}
                    alt={booking.vehicleName}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-ink">{booking.vehicleName}</h3>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {vehicle ? `${vehicle.year} · ${vehicle.brand}` : "SavariGo fleet"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vehicle && (
                      <>
                        <SpecChip
                          icon={Settings2}
                          label={
                            vehicle.transmission === "AUTOMATIC" ? "Automatic" : "Manual"
                          }
                        />
                        <SpecChip
                          icon={Fuel}
                          label={
                            vehicle.fuelType.charAt(0) +
                            vehicle.fuelType.slice(1).toLowerCase()
                          }
                        />
                        <SpecChip icon={Users} label={`${vehicle.seats} seats`} />
                        <SpecChip icon={Gauge} label={vehicle.mileage} />
                      </>
                    )}
                  </div>
                  <Link
                    href={`/vehicles/${booking.vehicleSlug}`}
                    className="mt-3 inline-block text-[12px] font-semibold text-brand-700 hover:underline"
                  >
                    View vehicle page
                  </Link>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                <DetailRow
                  icon={CalendarDays}
                  label="Pickup"
                  value={`${formatDate(booking.pickupDate)} · ${pickupTime}`}
                />
                <DetailRow
                  icon={CalendarDays}
                  label="Return"
                  value={`${formatDate(booking.returnDate)} · ${returnTime}`}
                />
                <DetailRow icon={MapPin} label="Pickup location" value={booking.pickupLocation} />
                <DetailRow icon={Milestone} label="Drop location" value={booking.dropLocation} />
                <DetailRow
                  icon={Clock}
                  label="Duration"
                  value={`${booking.duration} ${booking.duration === 1 ? "day" : "days"}`}
                />
                <DetailRow
                  icon={Shield}
                  label="Mileage limit"
                  value={
                    vehicle?.mileageLimitKm
                      ? `${vehicle.mileageLimitKm} km / day`
                      : "Unlimited kilometres"
                  }
                />
              </dl>
            </div>
          </Panel>

          <Panel title="Payment summary">
            <div className="p-5">
              <ul className="space-y-2.5 text-[12.5px]">
                <Row label={`Rental (${booking.duration} ${booking.duration === 1 ? "day" : "days"})`} value={inr(booking.rentalAmount)} />
                {apiBooking.amounts.extrasAmount > 0 && (
                  <Row label="Add-ons" value={inr(apiBooking.amounts.extrasAmount)} />
                )}
                {apiBooking.amounts.discountAmount > 0 && (
                  <Row label="Discount" value={`−${inr(apiBooking.amounts.discountAmount)}`} />
                )}
                <Row label="Security deposit (refundable)" value={inr(booking.deposit)} />
                <Row label="Taxes & fees" value={inr(apiBooking.amounts.taxAmount)} />
                <li className="border-t border-line pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-bold text-ink">
                      {booking.paymentStatus === "paid" ? "Total paid" : "Total payable"}
                    </span>
                    <span className="font-display text-[19px] font-extrabold text-ink">
                      {inr(booking.total)}
                    </span>
                  </div>
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <CreditCard className="size-3.5 text-muted" />
                  {booking.paymentMethod}
                </span>
                <PaymentStatusBadge status={booking.paymentStatus} />
                <span className="ml-auto text-[11px] text-muted">
                  {booking.paymentStatus === "paid" ? "Paid on" : "Booked on"}{" "}
                  {formatDate(booking.createdAt)}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <div className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-muted">
                  {booking.paymentStatus === "paid" ? "Amount paid" : "Amount payable"}
                </span>
                <span className="font-display text-[24px] font-extrabold text-ink">
                  {inr(booking.total)}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Includes {inr(booking.deposit)} refundable deposit
              </p>
              <div className="mt-4">
                <BookingDetailActions
                  bookingId={apiBooking.id}
                  code={booking.code}
                  deposit={booking.deposit}
                  cancellable={
                    apiBooking.status === "PENDING" || apiBooking.status === "CONFIRMED"
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-line bg-page/60 px-5 py-3">
              <CircleDollarSign className="size-4 text-brand-600" />
              <p className="text-[11px] text-ink-soft">
                Deposit refunded within 3–5 days of return.
              </p>
            </div>
          </Panel>

          <Panel title="Pickup hub">
            <div className="p-5">
              <p className="text-[13px] font-bold text-ink">
                {apiBooking.pickupLocation.name}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {apiBooking.pickupLocation.address}
                {apiBooking.pickupLocation.city
                  ? `, ${apiBooking.pickupLocation.city}`
                  : ""}
              </p>
              <div className="mt-3 space-y-1.5 text-[12px] text-ink-soft">
                <p className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted" /> Pickup at {pickupTime}
                </p>
                {apiBooking.pickupLocation.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted" />{" "}
                    {apiBooking.pickupLocation.phone}
                  </p>
                )}
              </div>
              <p className="mt-3 rounded-lg bg-brand-50/70 px-3 py-2 text-[11px] leading-relaxed text-brand-800">
                Carry your original driving licence and a government photo ID for handover.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SpecChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page/70 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
      <Icon className="size-3.5 text-muted" /> {label}
    </span>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-page text-muted">
        <Icon className="size-3.5" />
      </span>
      <div>
        <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
        <dd className="text-[12.5px] font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className={muted ? "text-muted" : "font-semibold text-ink"}>{value}</span>
    </li>
  );
}

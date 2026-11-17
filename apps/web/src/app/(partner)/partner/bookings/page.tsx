import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Hand, Inbox, Users } from "lucide-react";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  firstParam,
  inr,
  whenTime,
} from "@/components/admin/ui";
import {
  AdminBookingStatus,
  AdminPaymentStatus,
} from "@/components/admin/status-badge";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { Paginated, VendorBookingItem, VendorOverview } from "@/lib/api/types";
import { declineOwnBooking, updateOwnBookingStatus } from "../actions";

export const metadata: Metadata = { title: "Booking Requests" };

export default async function PartnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [requests, overview] = await Promise.all([
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "PENDING", q, page, limit: 20 },
    }),
    vendorRequest<VendorOverview>("/vendor/overview"),
  ]);

  const commission = overview.partner.commissionPercent;
  const shareOf = (booking: VendorBookingItem) =>
    Math.round(booking.totalAmount * (1 - commission / 100) * 100) / 100;

  const search = q ? `?q=${encodeURIComponent(q)}` : "";
  const redirectTo = `/partner/bookings${search}`;

  return (
    <AdminPage
      title="Booking Requests"
      description="Riders who picked one of your vehicles. Accepting confirms the booking and keeps the dates reserved; declining cancels it and refunds the rider."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/active" className={adminButton}>
          <CalendarCheck className="size-4" /> View active rentals
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Waiting on you"
          value={String(requests.meta.total)}
          hint="PENDING bookings on your fleet"
          icon={Inbox}
          tint="butter"
        />
        <StatCard
          label="Oldest request"
          value={
            requests.data.length > 0
              ? whenTime(requests.data.at(-1)?.createdAt)
              : "—"
          }
          hint="Requests are listed newest first"
          icon={Users}
          tint="lilac"
        />
        <StatCard
          label="Value waiting"
          value={inr(
            requests.data.reduce((sum, booking) => sum + booking.totalAmount, 0),
          )}
          hint="Total of the requests on this page"
          icon={Hand}
          tint="mint"
        />
        <StatCard
          label="Your commission rate"
          value={`${commission}%`}
          hint={`Set by Master Admin — you keep ${100 - commission}%`}
          icon={CalendarCheck}
          tint="sky"
        />
      </StatGrid>

      <AdminPanel
        title={`${requests.meta.total} pending request${requests.meta.total === 1 ? "" : "s"}`}
        description="You can only see requests for vehicles that belong to you."
      >
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <Field label="Search" className="w-64">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Booking code or rider name"
              className={adminInput}
            />
          </Field>
          <button className={adminButton} type="submit">
            Search
          </button>
          {q && (
            <Link href="/partner/bookings" className={adminButtonDanger}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1080}
          head={[
            "Request",
            "Rider",
            "Vehicle",
            "Pickup",
            "Return",
            "Booking value",
            "Your share",
            "Decision",
          ]}
        >
          {requests.data.length === 0 && (
            <AdminEmpty colSpan={8}>
              {overview.bookings.pending > 0
                ? "No pending request matches that search."
                : "Nothing to action right now — new booking requests appear here as riders reserve."}
            </AdminEmpty>
          )}
          {requests.data.map((booking) => (
            <tr key={booking.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-4">
                <p className="font-mono text-[12px] font-semibold text-ink">{booking.code}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Placed {whenTime(booking.createdAt)}
                </p>
                <div className="mt-1.5">
                  <AdminBookingStatus status={booking.status} />
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{booking.customerName}</p>
                <p className="text-[11px] text-muted">{booking.customerEmail}</p>
                {booking.specialRequests && (
                  <p className="mt-1 max-w-56 text-[11px] italic text-ink-soft">
                    “{booking.specialRequests}”
                  </p>
                )}
              </td>
              <td className="px-5 py-4">
                <Link
                  href={`/vehicles/${booking.vehicle.slug}`}
                  className="font-semibold text-ink hover:text-brand-700"
                >
                  {booking.vehicle.name}
                </Link>
                <p className="font-mono text-[11px] text-muted">
                  {booking.vehicle.registrationNumber ?? "Plate not recorded"}
                </p>
                <p className="text-[11px] text-muted">{booking.vehicle.category}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {whenTime(booking.pickupAt)}
                <p className="text-[11px] text-muted">{booking.pickupLocation}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {whenTime(booking.returnAt)}
                <p className="text-[11px] text-muted">
                  {booking.durationDays} day{booking.durationDays === 1 ? "" : "s"}
                  {booking.dropLocation ? ` · drop ${booking.dropLocation}` : ""}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{inr(booking.totalAmount)}</p>
                <p className="text-[11px] text-muted">
                  Rental {inr(booking.rentalAmount)} · tax {inr(booking.taxAmount)}
                </p>
                <p className="text-[11px] text-muted">
                  Deposit {inr(booking.depositAmount)}
                  {booking.discountAmount > 0 ? ` · off ${inr(booking.discountAmount)}` : ""}
                </p>
                <div className="mt-1">
                  <AdminPaymentStatus status={booking.paymentStatus} />
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-brand-700">{inr(shareOf(booking))}</p>
                <p className="text-[11px] text-muted">
                  {inr(booking.totalAmount)} − {commission}% platform commission
                </p>
                <p className="text-[11px] text-muted">Paid so far: {inr(booking.paidAmount)}</p>
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <form action={updateOwnBookingStatus} className="inline">
                    <input type="hidden" name="id" value={booking.id} />
                    <input type="hidden" name="status" value="CONFIRMED" />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button className={adminButton} type="submit">
                      Accept
                    </button>
                  </form>
                  <AdminDrawer label="Decline">
                    <form action={declineOwnBooking} className="space-y-3">
                      <input type="hidden" name="id" value={booking.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <Field
                        label="Reason for the rider"
                        hint="Saved on the booking and sent to the rider as the cancellation reason."
                      >
                        <input
                          name="reason"
                          placeholder="Vehicle needed for service"
                          className={adminInput}
                        />
                      </Field>
                      <p className="text-[11.5px] leading-relaxed text-muted">
                        Declining cancels {booking.code} and releases the reserved dates. Any
                        amount the rider already paid is refunded by the cancellation rules.
                      </p>
                      <button className={adminButtonDanger} type="submit">
                        Decline request
                      </button>
                    </form>
                  </AdminDrawer>
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>
    </AdminPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CirclePlay, Flag, KeyRound, Timer } from "lucide-react";
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
  adminButtonSoft,
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
import { updateOwnBookingStatus } from "../actions";

export const metadata: Metadata = { title: "Active Rentals" };

type Row = VendorBookingItem & { phase: "CONFIRMED" | "ONGOING" };

/** Positive means the rider still has days left, negative means it is overdue. */
function daysLeft(returnAt: string) {
  const ms = new Date(returnAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default async function PartnerActiveRentalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const [confirmed, ongoing, overview] = await Promise.all([
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "CONFIRMED", limit: 100 },
    }),
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "ONGOING", limit: 100 },
    }),
    vendorRequest<VendorOverview>("/vendor/overview"),
  ]);

  const rows: Row[] = [
    ...ongoing.data.map((booking) => ({ ...booking, phase: "ONGOING" as const })),
    ...confirmed.data.map((booking) => ({ ...booking, phase: "CONFIRMED" as const })),
  ];
  const overdue = rows.filter((row) => row.phase === "ONGOING" && daysLeft(row.returnAt) < 0);
  const commission = overview.partner.commissionPercent;
  const redirectTo = "/partner/active";

  return (
    <AdminPage
      title="Active Rentals"
      description="Every confirmed or running rental on your fleet. Start the trip when the rider collects the vehicle and complete it when the vehicle is back with you."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/availability" className={adminButton}>
          <Timer className="size-4" /> Availability calendar
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Active rentals"
          value={String(rows.length)}
          hint={`Confirmed ${confirmed.meta.total} · ongoing ${ongoing.meta.total}`}
          icon={KeyRound}
        />
        <StatCard
          label="Waiting for pickup"
          value={String(confirmed.meta.total)}
          hint="Confirmed but not started"
          icon={CirclePlay}
          tint="sky"
        />
        <StatCard
          label="Out on rental"
          value={String(ongoing.meta.total)}
          hint="Marked ongoing right now"
          icon={Timer}
          tint="lilac"
        />
        <StatCard
          label="Past return date"
          value={String(overdue.length)}
          hint="Still ongoing after the return date"
          icon={Flag}
          tint={overdue.length > 0 ? "peach" : "mint"}
        />
      </StatGrid>

      <AdminPanel
        title="On the road and booked ahead"
        description="Rental length is fixed by the booking the rider reserved; SavariGo does not store a separate extension request, so agree any change with the rider through Support."
      >
        <AdminTable
          minWidth={1180}
          head={["Booking", "Rider", "Vehicle", "Window", "Deposit & payment", "Actions"]}
        >
          {rows.length === 0 && (
            <AdminEmpty colSpan={6}>
              No rental is running right now. Accepted requests move here once you confirm them.
            </AdminEmpty>
          )}
          {rows.map((booking) => {
            const left = daysLeft(booking.returnAt);
            return (
              <tr key={booking.id} className="align-top transition hover:bg-page/60">
                <td className="px-5 py-4">
                  <p className="font-mono text-[12px] font-semibold text-ink">{booking.code}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <AdminBookingStatus status={booking.status} />
                    <AdminPaymentStatus status={booking.paymentStatus} />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{booking.customerName}</p>
                  <p className="text-[11px] text-muted">{booking.customerEmail}</p>
                  {booking.driverName && (
                    <p className="text-[11px] text-muted">Driver: {booking.driverName}</p>
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
                  <p>{whenTime(booking.pickupAt)}</p>
                  <p className="text-[11px] text-muted">→ {whenTime(booking.returnAt)}</p>
                  <p
                    className={
                      booking.phase === "ONGOING" && left < 0
                        ? "mt-1 text-[11px] font-bold text-red-600"
                        : "mt-1 text-[11px] font-semibold text-brand-700"
                    }
                  >
                    {booking.phase === "ONGOING"
                      ? left >= 0
                        ? `${left} day${left === 1 ? "" : "s"} left`
                        : `${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} overdue`
                      : `${booking.durationDays} day${booking.durationDays === 1 ? "" : "s"} reserved`}
                  </p>
                  <p className="text-[11px] text-muted">{booking.pickupLocation}</p>
                </td>
                <td className="px-5 py-4 text-[12px]">
                  <p className="font-semibold text-ink">{inr(booking.totalAmount)} total</p>
                  <p className="text-[11px] text-muted">{inr(booking.paidAmount)} collected</p>
                  <p className="text-[11px] text-muted">{inr(booking.depositAmount)} deposit held</p>
                  <p className="text-[11px] text-muted">
                    Your share {inr(booking.totalAmount * (1 - commission / 100))}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AdminAction>
                    {booking.phase === "CONFIRMED" ? (
                      <form action={updateOwnBookingStatus} className="inline">
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="status" value="ONGOING" />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button className={adminButton} type="submit">
                          Start rental
                        </button>
                      </form>
                    ) : (
                      <form action={updateOwnBookingStatus} className="inline">
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="status" value="COMPLETED" />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button className={adminButton} type="submit">
                          Complete rental
                        </button>
                      </form>
                    )}
                    {booking.phase === "CONFIRMED" && (
                      <AdminDrawer label="No-show">
                        <form action={updateOwnBookingStatus} className="space-y-3">
                          <input type="hidden" name="id" value={booking.id} />
                          <input type="hidden" name="status" value="NO_SHOW" />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <Field label="Note for the rider">
                            <input
                              name="note"
                              placeholder="Vehicle not collected at the pickup window"
                              className={adminInput}
                            />
                          </Field>
                          <p className="text-[11.5px] leading-relaxed text-muted">
                            Marking a no-show closes the booking and releases the reserved dates.
                            Refund maths is only run by the cancellation path, so use a note here
                            if money is still owed.
                          </p>
                          <button className={adminButtonDanger} type="submit">
                            Mark no-show
                          </button>
                        </form>
                      </AdminDrawer>
                    )}
                    <Link
                      href={`/partner/support?booking=${booking.code}`}
                      className={adminButtonSoft}
                    >
                      Raise an issue
                    </Link>
                  </AdminAction>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      </AdminPanel>
    </AdminPage>
  );
}

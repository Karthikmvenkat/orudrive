import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, CalendarClock, Search, TrendingUp } from "lucide-react";
import {
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
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
import { PortalTabs, StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { ApiVehicle, Paginated, VendorBookingItem } from "@/lib/api/types";

export const metadata: Metadata = { title: "Rental History" };

const FILTERS = [
  { key: "", label: "All closed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "NO_SHOW", label: "No show" },
];

export default async function PartnerHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const q = firstParam(params.q);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const vehicleId = firstParam(params.vehicleId);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [history, fleet] = await Promise.all([
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: {
        status: status || undefined,
        q,
        from: from ? `${from}T00:00:00+05:30` : undefined,
        to: to ? `${to}T23:59:59+05:30` : undefined,
        vehicleId: vehicleId || undefined,
        page,
        limit: 20,
      },
    }),
    vendorRequest<Paginated<ApiVehicle>>("/vehicles/manage", { query: { limit: 100 } }),
  ]);

  const collected = history.data.reduce((sum, row) => sum + row.paidAmount, 0);
  const query: Record<string, string | undefined> = {
    status: status || undefined,
    q,
    from,
    to,
    vehicleId: vehicleId || undefined,
  };

  return (
    <AdminPage
      title="Rental History"
      description="Every finished, cancelled and no-show booking on your fleet. Search by code or rider, narrow to one vehicle, or pick a pickup date range."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/earnings" className={adminButton}>
          <Banknote className="size-4" /> Earnings & payouts
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Rows on this page"
          value={String(history.data.length)}
          hint={`of ${history.meta.total} matching bookings`}
          icon={CalendarClock}
        />
        <StatCard
          label="Collected here"
          value={inr(collected)}
          hint="Payments recorded against these bookings"
          icon={Banknote}
          tint="mint"
        />
        <StatCard
          label="Booking value"
          value={inr(history.data.reduce((sum, row) => sum + row.totalAmount, 0))}
          hint="Totals invoiced on this page"
          icon={TrendingUp}
          tint="sky"
        />
        <StatCard
          label="Your fleet"
          value={String(fleet.meta.total)}
          hint="Vehicles you can filter history by"
          icon={Search}
          tint="lilac"
        />
      </StatGrid>

      <PortalTabs
        tabs={FILTERS.map((filter) => ({ key: filter.key, label: filter.label }))}
        active={status}
        basePath="/partner/history"
        param="status"
        search={query}
      />

      <AdminPanel title={`${history.meta.total} booking${history.meta.total === 1 ? "" : "s"}`}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <Field label="Search" className="w-56">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Code or rider"
              className={adminInput}
            />
          </Field>
          <Field label="Vehicle" className="w-52">
            <select name="vehicleId" defaultValue={vehicleId ?? ""} className={adminInput}>
              <option value="">Every vehicle</option>
              {fleet.data.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pickup from" className="w-44">
            <input type="date" name="from" defaultValue={from ?? ""} className={adminInput} />
          </Field>
          <Field label="Pickup to" className="w-44">
            <input type="date" name="to" defaultValue={to ?? ""} className={adminInput} />
          </Field>
          <button className={adminButton} type="submit">
            Apply
          </button>
          {(q || from || to || vehicleId) && (
            <Link href="/partner/history" className={adminButtonSoft}>
              Reset
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1120}
          head={["Booking", "Rider", "Vehicle", "Pickup", "Return", "Value", "Paid", "Status"]}
        >
          {history.data.length === 0 && (
            <AdminEmpty colSpan={8}>
              No rental matches these filters. Widen the date range or clear the search.
            </AdminEmpty>
          )}
          {history.data.map((booking) => (
            <tr key={booking.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-4">
                <p className="font-mono text-[12px] font-semibold text-ink">{booking.code}</p>
                {booking.couponCode && (
                  <p className="text-[11px] text-muted">Coupon {booking.couponCode}</p>
                )}
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{booking.customerName}</p>
                <p className="text-[11px] text-muted">{booking.customerEmail}</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{booking.vehicle.name}</p>
                <p className="font-mono text-[11px] text-muted">
                  {booking.vehicle.registrationNumber ?? "Plate not recorded"}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {whenTime(booking.pickupAt)}
                <p className="text-[11px] text-muted">{booking.pickupLocation}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {whenTime(booking.returnAt)}
                <p className="text-[11px] text-muted">
                  {booking.durationDays} day{booking.durationDays === 1 ? "" : "s"}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px]">
                <p className="font-semibold text-ink">{inr(booking.totalAmount)}</p>
                {booking.discountAmount > 0 && (
                  <p className="text-[11px] text-muted">− {inr(booking.discountAmount)} coupon</p>
                )}
              </td>
              <td className="px-5 py-4 text-[12px]">
                <p className="font-semibold text-ink">{inr(booking.paidAmount)}</p>
                <div className="mt-1">
                  <AdminPaymentStatus status={booking.paymentStatus} />
                </div>
              </td>
              <td className="px-5 py-4">
                <AdminBookingStatus status={booking.status} />
                {booking.cancelledAt && (
                  <p className="mt-1 text-[11px] text-muted">
                    Cancelled {whenTime(booking.cancelledAt)}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={history.meta.page}
          totalPages={history.meta.totalPages}
          path="/partner/history"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

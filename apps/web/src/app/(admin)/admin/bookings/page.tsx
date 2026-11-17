import Link from "next/link";
import type { Metadata } from "next";
import { staffRequest } from "@/lib/api/server";
import type {
  AdminDriverItem,
  ApiBooking,
  ApiBookingStatus,
  Paginated,
} from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminButtonSoft,
  adminInput,
  adminTextarea,
  firstParam,
  inr,
  whenTime,
} from "@/components/admin/ui";
import {
  AdminBookingStatus,
  AdminPaymentStatus,
} from "@/components/admin/status-badge";
import {
  assignBookingDriver,
  cancelManagedBooking,
  updateBookingStatus,
} from "../actions";

export const metadata: Metadata = { title: "Bookings · Admin" };

const statuses: ApiBookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const transitions: Record<ApiBookingStatus, ApiBookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ONGOING", "CANCELLED", "NO_SHOW"],
  ONGOING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status);
  const q = firstParam(params.q);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [bookings, drivers] = await Promise.all([
    staffRequest<Paginated<ApiBooking>>("/bookings/manage", {
      query: { status, q, page, limit: 15 },
    }),
    staffRequest<Paginated<AdminDriverItem>>("/drivers/manage", {
      query: { status: "VERIFIED", limit: 50 },
    }),
  ]);

  const query: Record<string, string | undefined> = { status, q };
  const redirectTo = `/admin/bookings${
    new URLSearchParams(
      Object.entries(query).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    ).toString()
      ? `?${new URLSearchParams(
          Object.entries(query).filter((entry): entry is [string, string] =>
            Boolean(entry[1]),
          ),
        ).toString()}`
      : ""
  }`;
  const driverOptions = drivers.data;

  return (
    <AdminPage
      title="Bookings"
      description="Advance the lifecycle, assign drivers and cancel with a recorded reason."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Field label="Search" className="w-56">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Code, email or phone"
              className={adminInput}
            />
          </Field>
          <Field label="Status" className="w-40">
            <select name="status" defaultValue={status ?? ""} className={adminInput}>
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className={adminButton}>
            Filter
          </button>
          {(q || status) && (
            <Link href="/admin/bookings" className={adminButtonSoft}>
              Reset
            </Link>
          )}
        </form>
      }
    >
      <AdminPanel
        title={`${bookings.meta.total} booking${bookings.meta.total === 1 ? "" : "s"}`}
        description="Newest first"
      >
        <AdminTable
          minWidth={1080}
          head={[
            "Code",
            "Customer",
            "Vehicle",
            "Pickup",
            "Total",
            "Status",
            "Payment",
            "Actions",
          ]}
        >
          {bookings.data.length === 0 && (
            <AdminEmpty colSpan={8}>No bookings match these filters.</AdminEmpty>
          )}
          {bookings.data.map((booking) => {
            const next = transitions[booking.status] ?? [];
            const assigned = booking.driver?.id ?? "";
            return (
              <tr key={booking.id} className="align-top">
                <td className="px-5 py-4">
                  <Link
                    href={`/booking/${booking.code}/confirmed`}
                    className="font-bold text-ink hover:text-brand-700"
                  >
                    {booking.code}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {whenTime(booking.createdAt)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">
                    {booking.customer.fullName}
                  </p>
                  <p className="text-[11px] text-muted">{booking.customer.email}</p>
                  <p className="text-[11px] text-muted">{booking.customer.phone}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{booking.vehicle.name}</p>
                  <p className="text-[11px] text-muted">
                    {booking.pickupLocation.name} · {booking.durationDays}d
                  </p>
                  {booking.driver && (
                    <p className="mt-1 text-[11px] font-semibold text-brand-700">
                      Driver: {booking.driver.fullName}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {whenTime(booking.pickupAt)}
                  <p className="text-[11px] text-muted">
                    Return {whenTime(booking.returnAt)}
                  </p>
                </td>
                <td className="px-5 py-4 font-semibold text-ink">
                  {inr(booking.amounts.totalAmount)}
                  <p className="text-[11px] font-normal text-muted">
                    Rent {inr(booking.amounts.rentalAmount)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AdminBookingStatus status={booking.status} />
                  {booking.coupon && (
                    <p className="mt-1 text-[11px] text-muted">
                      {booking.coupon.code}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <AdminPaymentStatus status={booking.paymentStatus} />
                </td>
                <td className="px-5 py-4">
                  {next.length === 0 &&
                  !assigned &&
                  booking.status !== "CANCELLED" ? (
                    <span className="text-[11px] text-muted">Settled</span>
                  ) : (
                    <AdminAction>
                      {next.length > 0 && (
                        <AdminDrawer label="Status">
                          <form
                            action={updateBookingStatus}
                            className="space-y-3"
                          >
                            <input type="hidden" name="id" value={booking.id} />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={redirectTo}
                            />
                            <Field label="Move to">
                              <select
                                name="status"
                                className={adminInput}
                                defaultValue={next[0]}
                              >
                                {next.map((value) => (
                                  <option key={value} value={value}>
                                    {value.replace("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Note (optional)">
                              <input
                                name="note"
                                className={adminInput}
                                placeholder="Visible in the audit trail"
                              />
                            </Field>
                            <button type="submit" className={adminButton}>
                              Save status
                            </button>
                          </form>
                        </AdminDrawer>
                      )}
                      <AdminDrawer label="Driver">
                        <form action={assignBookingDriver} className="space-y-3">
                          <input type="hidden" name="id" value={booking.id} />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={redirectTo}
                          />
                          <Field label="Assigned driver">
                            <select
                              name="driverId"
                              className={adminInput}
                              defaultValue={assigned}
                            >
                              <option value="">No driver</option>
                              {driverOptions.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.fullName} · {driver.totalTrips} trips
                                </option>
                              ))}
                            </select>
                          </Field>
                          <button type="submit" className={adminButton}>
                            Save driver
                          </button>
                        </form>
                      </AdminDrawer>
                      {booking.status !== "CANCELLED" &&
                        booking.status !== "COMPLETED" && (
                          <AdminDrawer label="Cancel">
                            <form
                              action={cancelManagedBooking}
                              className="space-y-3"
                            >
                              <input type="hidden" name="id" value={booking.id} />
                              <input
                                type="hidden"
                                name="redirectTo"
                                value={redirectTo}
                              />
                              <Field label="Cancellation reason">
                                <textarea
                                  name="reason"
                                  className={adminTextarea}
                                  placeholder="Customer called to reschedule"
                                />
                              </Field>
                              <button
                                type="submit"
                                className={adminButtonDanger}
                              >
                                Cancel booking
                              </button>
                            </form>
                          </AdminDrawer>
                        )}
                    </AdminAction>
                  )}
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <AdminPager
          page={bookings.meta.page}
          totalPages={bookings.meta.totalPages}
          path="/admin/bookings"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

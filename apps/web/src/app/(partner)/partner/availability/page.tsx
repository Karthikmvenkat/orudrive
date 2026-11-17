import type { Metadata } from "next";
import Link from "next/link";
import { Ban, CalendarDays, CalendarRange, CarFront } from "lucide-react";
import {
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  firstParam,
  whenTime,
} from "@/components/admin/ui";
import { AdminVehicleStatus } from "@/components/admin/status-badge";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { VendorAvailability } from "@/lib/api/types";
import { createAvailabilityBlock, removeAvailabilityBlock } from "../actions";

export const metadata: Metadata = { title: "Vehicle Availability" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Day buckets are compared in IST so the grid matches what riders see. */
function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function keyOf(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eachDay(from: Date, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + index));
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
    };
  });
}

export default async function PartnerAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const vehicleId = firstParam(params.vehicleId) ?? "";
  const mode = firstParam(params.mode) === "day" ? "day" : "month";
  const requestedMonth = firstParam(params.month) ?? "";

  const today = new Date(dayKey(new Date().toISOString()));
  const validMonth = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : null;
  const anchor = validMonth ? new Date(`${validMonth}-01T00:00:00Z`) : today;
  const anchorYear = anchor.getUTCFullYear();
  const anchorMonth = anchor.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(anchorYear, anchorMonth + 1, 0)).getUTCDate();
  const todayKey = dayKey(new Date().toISOString());

  const windowDays = mode === "day" ? 21 : daysInMonth;
  const windowStart = mode === "day" ? todayKey : keyOf(anchorYear, anchorMonth, 1);
  const windowEnd = mode === "day"
    ? dayKey(new Date(today.getTime() + 20 * 86_400_000).toISOString())
    : keyOf(anchorYear, anchorMonth, daysInMonth);

  const data = await vendorRequest<VendorAvailability>("/vendor/availability", {
    query: {
      from: `${windowStart}T00:00:00+05:30`,
      to: `${windowEnd}T23:59:59+05:30`,
      vehicleId: vehicleId || undefined,
    },
  });

  const busy = new Map<string, { booked: number; blocked: number }>();
  for (const row of data.rows) {
    const startKey = dayKey(row.startsAt);
    const endKey = dayKey(row.endsAt);
    const startDate = new Date(`${startKey}T00:00:00Z`);
    for (let index = 0; index < 400; index += 1) {
      const cursor = new Date(startDate.getTime() + index * 86_400_000)
        .toISOString()
        .slice(0, 10);
      if (cursor > endKey) break;
      const entry = busy.get(cursor) ?? { booked: 0, blocked: 0 };
      if (row.bookingId) entry.booked += 1;
      else entry.blocked += 1;
      busy.set(cursor, entry);
    }
  }

  const leading = (new Date(Date.UTC(anchorYear, anchorMonth, 1)).getUTCDay() + 6) % 7;
  const bookedRows = data.rows.filter((row) => row.bookingId);
  const blockRows = data.rows.filter((row) => !row.bookingId);
  const monthParam = `${anchorYear}-${String(anchorMonth + 1).padStart(2, "0")}`;
  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(anchorYear, anchorMonth + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const link = (override: Record<string, string | undefined>) => {
    const base: Record<string, string> =
      mode === "day" ? { mode } : { month: monthParam };
    if (vehicleId) base.vehicleId = vehicleId;
    const next = new URLSearchParams(base);
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const search = next.toString();
    return search ? `/partner/availability?${search}` : "/partner/availability";
  };
  const selfHref = link({});

  return (
    <AdminPage
      title="Vehicle Availability"
      description="Calendar view of your fleet. Booked periods come from live rentals and clear themselves when a rental completes or is cancelled; anything you block here stays hidden from riders until you remove it."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link
          href={mode === "day" ? link({ mode: "month" }) : link({ mode: "day" })}
          className={adminButton}
        >
          <CalendarDays className="size-4" />
          {mode === "day" ? "Monthly view" : "Daily view"}
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Vehicles"
          value={String(data.vehicles.length)}
          hint="In your fleet for this window"
          icon={CarFront}
        />
        <StatCard
          label="Booked periods"
          value={String(bookedRows.length)}
          hint="Driven by confirmed rentals"
          icon={CalendarRange}
          tint="sky"
        />
        <StatCard
          label="Blocks you set"
          value={String(blockRows.length)}
          hint="Maintenance or owner use"
          icon={Ban}
          tint="butter"
        />
        <StatCard
          label="Busy days"
          value={String(busy.size)}
          hint={mode === "day" ? "In the next 21 days" : "In this month"}
          icon={CalendarDays}
          tint="mint"
        />
      </StatGrid>

      <AdminPanel
        title={mode === "day" ? "Next 21 days" : `${anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}`}
        description="A dot means at least one of your vehicles is unavailable that day. Filter to a single vehicle to read one calendar at a time."
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4">
          <Link
            href={link({ vehicleId: undefined })}
            className={
              vehicleId === ""
                ? "rounded-full border border-forest bg-forest px-3.5 py-1.5 text-[12px] font-semibold text-white"
                : "rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-brand-300"
            }
          >
            Whole fleet
          </Link>
          {data.vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={link({ vehicleId: vehicle.id })}
              className={
                vehicleId === vehicle.id
                  ? "rounded-full border border-forest bg-forest px-3.5 py-1.5 text-[12px] font-semibold text-white"
                  : "rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-brand-300"
              }
            >
              {vehicle.name}
            </Link>
          ))}
        </div>

        {mode === "day" ? (
          <AdminTable minWidth={620} head={["Day", "Date", "Booked", "Blocked", "State"]}>
            {eachDay(today, windowDays).map((entry) => {
              const value = busy.get(entry.key) ?? { booked: 0, blocked: 0 };
              const total = value.booked + value.blocked;
              return (
                <tr key={entry.key} className="transition hover:bg-page/60">
                  <td className="px-5 py-3 text-[12px] font-semibold text-ink-soft">
                    {new Date(`${entry.key}T00:00:00Z`).toLocaleDateString("en-IN", {
                      weekday: "short",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink">{entry.key}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-soft">
                    {value.booked}
                  </td>
                  <td className="px-5 py-3 text-[13px] tabular-nums text-ink-soft">
                    {value.blocked}
                  </td>
                  <td className="px-5 py-3 text-[12px]">
                    {total === 0 ? (
                      <span className="font-semibold text-brand-700">
                        Free {data.vehicles.length > 0 ? `across ${data.vehicles.length} vehicle${data.vehicles.length === 1 ? "" : "s"}` : ""}
                      </span>
                    ) : (
                      <span className="text-ink-soft">
                        {total} vehicle period{total === 1 ? "" : "s"} held
                      </span>
                    )}
                    {entry.key === todayKey && (
                      <span className="ml-2 rounded-full bg-page px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Today
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Link
                href={link({ month: shiftMonth(-1) })}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-brand-300"
              >
                Previous month
              </Link>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-brand-500" /> Booked
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" /> Blocked
                </span>
              </div>
              <Link
                href={link({ month: shiftMonth(1) })}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-brand-300"
              >
                Next month
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              {WEEKDAYS.map((label) => (
                <span key={label} className="pb-1">
                  {label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: leading }).map((_, index) => (
                <span key={`pad-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                const key = keyOf(anchorYear, anchorMonth, day);
                const value = busy.get(key) ?? { booked: 0, blocked: 0 };
                const total = value.booked + value.blocked;
                return (
                  <div
                    key={key}
                    className={
                      total === 0
                        ? "rounded-xl border border-line bg-surface px-2 py-2 text-left"
                        : "rounded-xl border border-brand-200 bg-brand-50/70 px-2 py-2 text-left"
                    }
                  >
                    <p
                      className={
                        key === todayKey
                          ? "text-[12px] font-extrabold text-brand-700"
                          : "text-[12px] font-semibold text-ink-soft"
                      }
                    >
                      {day}
                    </p>
                    {total === 0 ? (
                      <p className="mt-1 text-[10px] text-muted">Free</p>
                    ) : (
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-ink-soft tabular-nums">
                        {value.booked > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full bg-brand-500" />
                            {value.booked}
                          </span>
                        )}
                        {value.blocked > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full bg-amber-500" />
                            {value.blocked}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AdminPanel>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <AdminPanel
          title="Periods in this window"
          description="Booked rows follow the rental. Only rows you blocked yourself can be removed."
        >
          <AdminTable minWidth={760} head={["Vehicle", "From", "To", "Type", "Note", ""]}>
            {data.rows.length === 0 && (
              <AdminEmpty colSpan={6}>
                Nothing is held on any vehicle in this window — every day is bookable.
              </AdminEmpty>
            )}
            {data.rows.map((row) => {
              const vehicle = data.vehicles.find((entry) => entry.id === row.vehicleId);
              return (
                <tr key={row.id} className="align-top transition hover:bg-page/60">
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-semibold text-ink">{vehicle?.name ?? "Vehicle"}</p>
                    {vehicle && (
                      <p className="mt-1">
                        <AdminVehicleStatus status={vehicle.status} />
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-ink-soft">{whenTime(row.startsAt)}</td>
                  <td className="px-5 py-3 text-[12px] text-ink-soft">{whenTime(row.endsAt)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        row.bookingId
                          ? "rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700"
                          : "rounded-full bg-tint-butter px-2.5 py-1 text-[11px] font-bold text-amber-700"
                      }
                    >
                      {row.bookingId ? "Booked" : row.status === "MAINTENANCE" ? "Maintenance" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11.5px] text-muted">
                    {row.note ?? (row.bookingId ? "Held by a live rental" : "—")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.bookingId ? (
                      <span className="text-[11px] text-muted">Clears with the rental</span>
                    ) : (
                      <form action={removeAvailabilityBlock} className="inline">
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={selfHref}
                        />
                        <button className={adminButtonDanger} type="submit">
                          Unblock
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </AdminPanel>

        <AdminPanel
          title="Block dates"
          description="Closed for maintenance, an accident, or your own use. Riders cannot reserve these windows."
        >
          <form action={createAvailabilityBlock} className="grid gap-3 p-5">
            <input type="hidden" name="redirectTo" value={selfHref} />
            <Field label="Vehicle">
              <select name="vehicleId" required defaultValue={vehicleId} className={adminInput}>
                <option value="">Choose a vehicle</option>
                {data.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input type="date" name="startsAt" required defaultValue={todayKey} className={adminInput} />
              </Field>
              <Field label="To">
                <input type="date" name="endsAt" required defaultValue={windowEnd} className={adminInput} />
              </Field>
            </div>
            <Field label="Reason">
              <select name="status" className={adminInput} defaultValue="BLOCKED">
                <option value="BLOCKED">Blocked — not for rent</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </Field>
            <Field label="Note" hint="Shown to your team in the rental record.">
              <input name="note" placeholder="Tyre change" className={adminInput} />
            </Field>
            <button className={adminButton} type="submit">
              <Ban className="size-4" /> Block these dates
            </button>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}

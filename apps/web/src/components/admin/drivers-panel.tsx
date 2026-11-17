import {
  AdminAction,
  AdminEmpty,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  inr,
  when,
} from "@/components/admin/ui";
import { AdminDriverStatus } from "@/components/admin/status-badge";
import { setDriverVerification } from "@/app/(admin)/admin/actions";
import { staffRequest } from "@/lib/api/server";
import type { AdminDriverItem, DriverVerification, Paginated } from "@/lib/api/types";

const statuses: DriverVerification[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

export async function DriversPanel({
  status,
  q,
  page,
}: {
  status?: string;
  q?: string;
  page: number;
}) {
  const drivers = await staffRequest<Paginated<AdminDriverItem>>("/drivers/manage", {
    query: { status, q, page, limit: 20 },
  });

  const query: Record<string, string | undefined> = { status, q, tab: "drivers" };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const redirectTo = `/admin/users?${search}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" method="get">
        <input type="hidden" name="tab" value="drivers" />
        <Field label="Search" className="w-48">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name or bio"
            className={adminInput}
          />
        </Field>
        <Field label="Verification" className="w-40">
          <select name="status" defaultValue={status ?? ""} className={adminInput}>
            <option value="">All</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <button className={adminButton} type="submit">
          Filter
        </button>
      </form>

      <AdminPanel title={`${drivers.meta.total} drivers`}>
        <AdminTable
          minWidth={1080}
          head={[
            "Driver",
            "Licence",
            "Experience",
            "Rates",
            "Trips",
            "Availability",
            "Verification",
            "Actions",
          ]}
        >
          {drivers.data.length === 0 && (
            <AdminEmpty colSpan={8}>No drivers match these filters.</AdminEmpty>
          )}
          {drivers.data.map((driver) => (
            <tr key={driver.id} className="align-top">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{driver.fullName}</p>
                <p className="text-[11px] text-muted">{driver.email}</p>
                <p className="text-[11px] text-muted">{driver.phone}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {driver.licenceNumber}
                <p className="text-[11px] text-muted">Expires {when(driver.licenceExpiry)}</p>
              </td>
              <td className="px-5 py-4 text-ink-soft">
                {driver.experienceYears} yrs
                <p className="text-[11px] text-muted">{driver.languages.join(", ") || "—"}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {inr(driver.dailyRate)}/day
                <p className="text-[11px] text-muted">{inr(driver.hourlyRate)}/hr</p>
              </td>
              <td className="px-5 py-4 text-ink-soft">
                {driver.totalTrips}
                <p className="text-[11px] text-muted">{driver.rating.toFixed(1)} ★</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {driver.isAvailable ? "Available" : "Off duty"}
              </td>
              <td className="px-5 py-4">
                <AdminDriverStatus status={driver.verificationStatus} />
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  {driver.verificationStatus !== "VERIFIED" && (
                    <form action={setDriverVerification}>
                      <input type="hidden" name="id" value={driver.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="VERIFIED" />
                      <button className="text-[12px] font-semibold text-brand-700 hover:underline">
                        Approve
                      </button>
                    </form>
                  )}
                  {driver.verificationStatus === "PENDING" && (
                    <form action={setDriverVerification}>
                      <input type="hidden" name="id" value={driver.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <button className={adminButtonDanger} type="submit">
                        Reject
                      </button>
                    </form>
                  )}
                  {driver.verificationStatus === "VERIFIED" && (
                    <form action={setDriverVerification}>
                      <input type="hidden" name="id" value={driver.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="SUSPENDED" />
                      <button className={adminButtonDanger} type="submit">
                        Suspend
                      </button>
                    </form>
                  )}
                  {driver.verificationStatus === "SUSPENDED" && (
                    <form action={setDriverVerification}>
                      <input type="hidden" name="id" value={driver.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="PENDING" />
                      <button className="text-[12px] font-semibold text-brand-700 hover:underline">
                        Reopen
                      </button>
                    </form>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={drivers.meta.page}
          totalPages={drivers.meta.totalPages}
          path="/admin/users"
          params={query}
        />
      </AdminPanel>
    </div>
  );
}

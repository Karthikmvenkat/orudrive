import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
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
} from "@/components/admin/ui";
import { AdminVehicleStatus } from "@/components/admin/status-badge";
import { PortalTabs } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { ApiVehicle, Paginated, VendorOverview } from "@/lib/api/types";
import {
  retireOwnVehicle,
  setOwnVehicleStatus,
  updateOwnVehicle,
} from "../actions";

export const metadata: Metadata = { title: "My Vehicles" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Pending approval" },
  { key: "AVAILABLE", label: "Available" },
  { key: "UNAVAILABLE", label: "Unavailable" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "RETIRED", label: "Retired" },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Pending approval",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

export default async function PartnerVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const q = firstParam(params.q);
  const category = firstParam(params.category) ?? "";
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [vehicles, overview, categories] = await Promise.all([
    vendorRequest<Paginated<ApiVehicle>>("/vehicles/manage", {
      query: { status: status || undefined, q, category: category || undefined, page, limit: 20 },
    }),
    vendorRequest<VendorOverview>("/vendor/overview"),
    vendorRequest<{ id: string; slug: string; name: string }[]>("/categories"),
  ]);

  const query: Record<string, string | undefined> = {
    status: status || undefined,
    q,
    category: category || undefined,
  };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const redirectTo = search ? `/partner/vehicles?${search}` : "/partner/vehicles";

  const counts: Record<string, number> = {
    "": overview.vehicles.total,
    DRAFT: overview.vehicles.byStatus.DRAFT ?? 0,
    AVAILABLE: overview.vehicles.byStatus.AVAILABLE ?? 0,
    UNAVAILABLE: overview.vehicles.byStatus.UNAVAILABLE ?? 0,
    MAINTENANCE: overview.vehicles.byStatus.MAINTENANCE ?? 0,
    RETIRED: overview.vehicles.byStatus.RETIRED ?? 0,
  };

  return (
    <AdminPage
      title="My Vehicles"
      description="Your own fleet only. SavariGo never shows another partner's vehicles here, and only Master Admin can move a vehicle from Pending approval to Available."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/vehicles/new" className={adminButton}>
          <Plus className="size-4" /> Add New Vehicle
        </Link>
      }
    >
      <PortalTabs
        tabs={FILTERS.map((filter) => ({
          key: filter.key,
          label: filter.label,
          count: counts[filter.key] ?? 0,
        }))}
        active={status}
        basePath="/partner/vehicles"
        param="status"
        search={query}
      />

      <AdminPanel title={`${vehicles.meta.total} of your vehicles`}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="category" value={category} />
          <Field label="Search" className="w-52">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, brand or plate"
              className={adminInput}
            />
          </Field>
          <Field label="Type" className="w-40">
            <select name="category" defaultValue={category} className={adminInput}>
              <option value="">All types</option>
              {categories.map((row) => (
                <option key={row.id} value={row.slug}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
          {(q || category) && (
            <Link href={`/partner/vehicles?status=${status}`} className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1140}
          head={["Vehicle", "Type", "Day rate", "Availability", "Approval", "Reviews", "Actions"]}
        >
          {vehicles.data.length === 0 && (
            <AdminEmpty colSpan={7}>
              {overview.vehicles.total === 0
                ? "You have not listed a vehicle yet. Use Add New Vehicle to submit one for approval."
                : "No vehicle matches these filters."}
            </AdminEmpty>
          )}
          {vehicles.data.map((vehicle) => {
            const plan = vehicle.pricing?.[0];
            return (
              <tr key={vehicle.id} className="align-top transition hover:bg-page/60">
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-page">
                      {vehicle.primaryImage ? (
                        <Image
                          src={vehicle.primaryImage.url}
                          alt={vehicle.primaryImage.alt}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <Link
                        href={`/vehicles/${vehicle.slug}`}
                        className="font-semibold text-ink hover:text-brand-700"
                      >
                        {vehicle.name}
                      </Link>
                      <p className="text-[11px] text-muted">
                        {vehicle.brand} · {vehicle.year}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {vehicle.registrationNumber ?? "Plate not recorded"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {vehicle.category.name}
                  <p className="text-[11px] text-muted">
                    {vehicle.transmission === "AUTOMATIC" ? "Automatic" : "Manual"} ·{" "}
                    {vehicle.fuelType.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-muted">{vehicle.location.city}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-ink">
                  {inr(vehicle.pricePerDay)}
                  <p className="text-[11px] font-normal text-muted">
                    {plan ? `${inr(plan.extraKmRate)}/extra km` : "No active plan"}
                  </p>
                  <p className="text-[11px] font-normal text-muted">
                    {vehicle.depositAmount > 0 ? `${inr(vehicle.depositAmount)} deposit` : "No deposit"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AdminVehicleStatus status={vehicle.status} />
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {vehicle.status === "DRAFT" ? (
                    <span className="font-semibold text-amber-700">Waiting on Master Admin</span>
                  ) : (
                    <span>{STATUS_LABEL[vehicle.status] ?? vehicle.status}</span>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    {vehicle.status === "AVAILABLE"
                      ? "Live on website and app"
                      : "Hidden from customers"}
                  </p>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft tabular-nums">
                  {vehicle.rating.toFixed(2)} ★
                  <p className="text-[11px] text-muted">{vehicle.reviewCount} reviews</p>
                </td>
                <td className="px-5 py-4">
                  <AdminAction>
                    <Link
                      href={`/partner/availability?vehicleId=${vehicle.id}`}
                      className="text-[12px] font-semibold text-brand-700 hover:underline"
                    >
                      Calendar
                    </Link>
                    <AdminDrawer label="Edit">
                      <form action={updateOwnVehicle} className="grid grid-cols-2 gap-3">
                        <input type="hidden" name="id" value={vehicle.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <Field label="Name">
                          <input name="name" defaultValue={vehicle.name} className={adminInput} />
                        </Field>
                        <Field label="Brand">
                          <input name="brand" defaultValue={vehicle.brand} className={adminInput} />
                        </Field>
                        <Field label="Year">
                          <input
                            name="year"
                            type="number"
                            min={1990}
                            max={2100}
                            defaultValue={vehicle.year}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Seats">
                          <input
                            name="seats"
                            type="number"
                            min={1}
                            max={12}
                            defaultValue={vehicle.seats}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Engine">
                          <input name="engine" defaultValue={vehicle.engine} className={adminInput} />
                        </Field>
                        <Field label="Mileage">
                          <input name="mileage" defaultValue={vehicle.mileage} className={adminInput} />
                        </Field>
                        <Field label="Deposit (₹)">
                          <input
                            name="depositAmount"
                            type="number"
                            step="0.01"
                            min={0}
                            defaultValue={vehicle.depositAmount}
                            className={adminInput}
                          />
                        </Field>
                        <Field label="Description" className="col-span-2">
                          <textarea
                            name="description"
                            defaultValue={vehicle.description}
                            className={adminTextarea}
                          />
                        </Field>
                        <div className="col-span-2">
                          <button className={adminButton} type="submit">
                            Save vehicle
                          </button>
                        </div>
                      </form>
                    </AdminDrawer>
                    <AdminDrawer label="Availability">
                      <form action={setOwnVehicleStatus} className="space-y-3">
                        <input type="hidden" name="id" value={vehicle.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <Field label="Mark as">
                          <select name="status" defaultValue={vehicle.status} className={adminInput}>
                            <option value="UNAVAILABLE">Unavailable</option>
                            <option value="MAINTENANCE">Maintenance</option>
                          </select>
                        </Field>
                        <p className="text-[11.5px] leading-relaxed text-muted">
                          Partners can always take a vehicle offline. Only Master Admin can set
                          Available, so approval can never be self-granted.
                        </p>
                        <button className={adminButtonSoft} type="submit">
                          Save
                        </button>
                      </form>
                    </AdminDrawer>
                    {vehicle.status !== "RETIRED" && (
                      <AdminDrawer label="Delete">
                        <form action={retireOwnVehicle} className="space-y-3">
                          <input type="hidden" name="id" value={vehicle.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <p className="text-[12px] text-muted">
                            Deleting retires the vehicle. Past bookings and payouts stay in your
                            history, and the listing disappears from the customer site.
                          </p>
                          <button className={adminButtonDanger} type="submit">
                            Retire {vehicle.name}
                          </button>
                        </form>
                      </AdminDrawer>
                    )}
                  </AdminAction>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <AdminPager
          page={vehicles.meta.page}
          totalPages={vehicles.meta.totalPages}
          path="/partner/vehicles"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

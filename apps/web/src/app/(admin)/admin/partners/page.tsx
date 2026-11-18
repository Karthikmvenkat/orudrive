import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import {
  AdminAction,
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
  firstParam,
  inr,
  when,
} from "@/components/admin/ui";
import { PartnerStatusBadge } from "@/components/portal/badges";
import { PortalTabs } from "@/components/portal/ui";
import { createPartner, setPartnerStatus } from "../actions";
import { staffRequest } from "@/lib/api/server";
import type { AdminOverview, AdminPartnerItem, Paginated } from "@/lib/api/types";

export const metadata: Metadata = { title: "Rental Partners" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "SUSPENDED", label: "Suspended" },
];

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const q = firstParam(params.q);
  const city = firstParam(params.city);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [partners, overview, cities] = await Promise.all([
    staffRequest<Paginated<AdminPartnerItem>>("/admin/partners", {
      query: { status: status || undefined, q, city, page, limit: 20 },
    }),
    staffRequest<AdminOverview>("/admin/overview"),
    staffRequest<{ city: string; partners: number }[]>("/admin/partners/cities"),
  ]);

  const query: Record<string, string | undefined> = { status: status || undefined, q, city };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const redirectTo = search ? `/admin/partners?${search}` : "/admin/partners";
  const showForm = firstParam(params.new) === "1";

  return (
    <AdminPage
      title="Rental Partners"
      description="Tie-up rental shops and owners. Only Master Admin can approve a partner or change its commission."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link
          href={showForm ? "/admin/partners" : "/admin/partners?new=1"}
          className={adminButton}
        >
          <Plus className="size-4" /> {showForm ? "Close form" : "Add Partner"}
        </Link>
      }
    >
      {showForm && <NewPartnerForm cities={cities.map((row) => row.city)} />}

      <PortalTabs
        tabs={FILTERS.map((filter) => ({
          key: filter.key,
          label: filter.label,
          count: filter.key
            ? (overview.partners.byStatus[filter.key] ?? 0)
            : overview.partners.total,
        }))}
        active={status}
        basePath="/admin/partners"
        param="status"
        search={query}
      />

      <AdminPanel title={`${partners.meta.total} partners`}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <Field label="Search" className="w-52">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, code or email"
              className={adminInput}
            />
          </Field>
          <Field label="City" className="w-44">
            <select name="city" defaultValue={city ?? ""} className={adminInput}>
              <option value="">All cities</option>
              {cities.map((row) => (
                <option key={row.city} value={row.city}>
                  {row.city} ({row.partners})
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
          {(q || city) && (
            <Link href={`/admin/partners?status=${status}`} className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1120}
          head={[
            "Code",
            "Partner",
            "Location",
            "Fleet",
            "Bookings",
            "Collected",
            "Commission",
            "Status",
            "Actions",
          ]}
        >
          {partners.data.length === 0 && (
            <AdminEmpty colSpan={9}>No rental partners match these filters.</AdminEmpty>
          )}
          {partners.data.map((partner) => (
            <tr key={partner.id} className="align-top transition hover:bg-page/60">
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-ink">
                {partner.partnerCode}
              </td>
              <td className="px-5 py-4">
                <Link
                  href={`/admin/partners/${partner.id}`}
                  className="font-semibold text-ink hover:text-brand-700"
                >
                  {partner.tradingName}
                </Link>
                <p className="text-[11px] text-muted">{partner.email}</p>
                <p className="text-[11px] text-muted">Joined {when(partner.joinedAt)}</p>
              </td>
              <td className="px-5 py-4 text-ink-soft">
                {partner.city}
                <p className="text-[11px] text-muted">{partner.state}</p>
              </td>
              <td className="px-5 py-4 tabular-nums text-ink-soft">
                {partner.vehicles}
                <p className="text-[11px] text-muted">{partner.available} live</p>
              </td>
              <td className="px-5 py-4 tabular-nums text-ink-soft">{partner.bookings}</td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-ink">
                {inr(partner.revenue, { compact: true })}
              </td>
              <td className="px-5 py-4 tabular-nums text-ink-soft">
                {partner.commissionPercent}%
              </td>
              <td className="px-5 py-4">
                <PartnerStatusBadge status={partner.status} />
                {partner.decisionNote && (
                  <p className="mt-1 max-w-[180px] text-[11px] leading-snug text-muted">
                    {partner.decisionNote}
                  </p>
                )}
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <Link
                    href={`/admin/partners/${partner.id}`}
                    aria-label={`Open ${partner.tradingName}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <Eye className="size-4" />
                  </Link>
                  {partner.status !== "APPROVED" && (
                    <form action={setPartnerStatus}>
                      <input type="hidden" name="id" value={partner.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <button className={adminButtonSoft} type="submit">
                        Approve
                      </button>
                    </form>
                  )}
                  {partner.status === "APPROVED" && (
                    <form action={setPartnerStatus}>
                      <input type="hidden" name="id" value={partner.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="SUSPENDED" />
                      <input
                        type="hidden"
                        name="note"
                        value="Suspended by Master Admin; fleet pulled from listings."
                      />
                      <button className={adminButtonDanger} type="submit">
                        Suspend
                      </button>
                    </form>
                  )}
                  {partner.status === "PENDING" && (
                    <form action={setPartnerStatus}>
                      <input type="hidden" name="id" value={partner.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <input
                        type="hidden"
                        name="note"
                        value="Application rejected; paperwork incomplete."
                      />
                      <button className={adminButtonDanger} type="submit">
                        Reject
                      </button>
                    </form>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={partners.meta.page}
          totalPages={partners.meta.totalPages}
          path="/admin/partners"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

function NewPartnerForm({ cities }: { cities: string[] }) {
  const options = [...new Set([...cities, "Puducherry", "Chennai", "Auroville"])]
    .sort()
    .map((value) => ({ value, label: value }));

  return (
    <AdminPanel
      title="Add Rental Partner"
      description="Creates the partner login and a pending profile. The partner stays pending until you approve it."
    >
      <form action={createPartner} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="redirectTo" value="/admin/partners?new=1" />
        <Field label="Trading name">
          <input name="tradingName" required minLength={2} maxLength={80} className={adminInput} />
        </Field>
        <Field label="Legal entity">
          <input name="legalName" maxLength={120} className={adminInput} />
        </Field>
        <Field label="Login email">
          <input name="email" type="email" required className={adminInput} />
        </Field>
        <Field label="Temporary password" hint="At least 10 characters">
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className={adminInput}
          />
        </Field>
        <Field label="Phone">
          <input name="phone" placeholder="+91 98400 00000" className={adminInput} />
        </Field>
        <Field label="GSTIN" hint="15 characters, required and unique per partner">
          <input
            name="gstin"
            required
            maxLength={15}
            pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}"
            title="Two digits, five letters, four digits, one letter, three alphanumerics — use capitals."
            placeholder="33ABCDE1234F1Z5"
            className={adminInput}
          />
        </Field>
        <Field label="City">
          <select name="city" defaultValue="Puducherry" className={adminInput}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="State">
          <input name="state" defaultValue="Puducherry" maxLength={60} className={adminInput} />
        </Field>
        <Field label="Commission %" hint="Platform fee kept on every booking">
          <input
            name="commissionPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={adminInput}
          />
        </Field>
        <Field label="Address" className="sm:col-span-2 lg:col-span-3">
          <input name="addressLine1" maxLength={160} className={adminInput} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <button className={adminButton} type="submit">
            Create partner
          </button>
        </div>
      </form>
    </AdminPanel>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  CarFront,
  Coins,
  Headset,
  Percent,
} from "lucide-react";
import {
  AdminAction,
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
  when,
} from "@/components/admin/ui";
import { DocumentStatusBadge, PartnerStatusBadge } from "@/components/portal/badges";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { ApiError } from "@/lib/api/http";
import { staffRequest } from "@/lib/api/server";
import type { AdminPartnerDetail } from "@/lib/api/types";
import { setPartnerCommission, setPartnerStatus, updatePartner } from "../../actions";

export const metadata: Metadata = { title: "Partner detail" };

export default async function AdminPartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let partner: AdminPartnerDetail;
  try {
    partner = await staffRequest<AdminPartnerDetail>(`/admin/partners/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const redirectTo = `/admin/partners/${id}`;
  const approved = partner.status === "APPROVED";

  return (
    <AdminPage
      title={partner.tradingName}
      description={`${partner.partnerCode} · ${partner.city}, ${partner.state}. Fleet, paperwork and payouts for this rental partner.`}
      notice={firstParam(query.notice)}
      error={firstParam(query.error)}
      action={
        <Link href="/admin/partners" className={adminButtonSoft}>
          <ArrowLeft className="size-4" /> All partners
        </Link>
      }
    >
      <StatGrid columns={5}>
        <StatCard
          label="Fleet"
          value={String(partner.vehicles.length)}
          hint={`${partner.available} listed live`}
          icon={CarFront}
        />
        <StatCard
          label="Bookings"
          value={String(partner.bookings)}
          hint="Completed and active"
          icon={CalendarCheck}
          tint="sky"
        />
        <StatCard
          label="Collected"
          value={inr(partner.revenue, { compact: true })}
          hint="Gross from their fleet"
          icon={Coins}
          tint="lilac"
        />
        <StatCard
          label="Commission"
          value={`${partner.commissionPercent}%`}
          hint="Kept by SavariGo"
          icon={Percent}
          tint="peach"
        />
        <StatCard
          label="Tickets"
          value={String(partner.openTickets)}
          hint="Raised by this partner"
          icon={Headset}
          tint="butter"
        />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <AdminPanel title="Approval">
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <PartnerStatusBadge status={partner.status} />
              <p className="text-[12px] text-muted">
                {partner.approvedAt
                  ? `Approved ${when(partner.approvedAt)}`
                  : "Not approved yet"}
              </p>
            </div>
            {partner.decisionNote && (
              <p className="rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-[12.5px] text-ink-soft">
                {partner.decisionNote}
              </p>
            )}
            <AdminAction>
              {!approved && (
                <form action={setPartnerStatus}>
                  <input type="hidden" name="id" value={partner.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <input
                    type="hidden"
                    name="note"
                    value="Approved by Master Admin; fleet is now publishable."
                  />
                  <button className={adminButton} type="submit">
                    Approve partner
                  </button>
                </form>
              )}
              {approved && (
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
              {(partner.status === "REJECTED" || partner.status === "SUSPENDED") && (
                <form action={setPartnerStatus}>
                  <input type="hidden" name="id" value={partner.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input type="hidden" name="status" value="PENDING" />
                  <input type="hidden" name="note" value="Sent back to the review queue." />
                  <button className={adminButtonSoft} type="submit">
                    Reopen review
                  </button>
                </form>
              )}
            </AdminAction>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Partners cannot approve their own vehicles or paperwork — every decision here is
              recorded against your admin account in the audit log.
            </p>
          </div>
        </AdminPanel>

        <AdminPanel title="Commission">
          <form action={setPartnerCommission} className="grid gap-4 p-5">
            <input type="hidden" name="id" value={partner.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Field label="Platform share %" hint="Applied to every new booking from this fleet">
              <input
                name="percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={partner.commissionPercent}
                className={adminInput}
              />
            </Field>
            <div>
              <button className={adminButtonSoft} type="submit">
                Save commission
              </button>
            </div>
          </form>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Fleet"
        description="Only APPROVED vehicles from APPROVED partners reach the customer website and app."
        action={
          <Link
            href={`/admin/vehicles?owner=${partner.userId}`}
            className="text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Open in Vehicle Management
          </Link>
        }
      >
        <AdminTable
          minWidth={860}
          head={["Vehicle", "Registration", "Category", "Hub", "From", "Status"]}
        >
          {partner.vehicles.length === 0 && (
            <AdminEmpty colSpan={6}>This partner has not listed a vehicle yet.</AdminEmpty>
          )}
          {partner.vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="transition hover:bg-page/60">
              <td className="px-5 py-3.5">
                <Link
                  href={`/vehicles/${vehicle.slug}`}
                  className="font-semibold text-ink hover:text-brand-700"
                >
                  {vehicle.name}
                </Link>
              </td>
              <td className="px-5 py-3.5 font-mono text-[11.5px] text-ink-soft">
                {vehicle.registrationNumber ?? "—"}
              </td>
              <td className="px-5 py-3.5 text-ink-soft">{vehicle.category}</td>
              <td className="px-5 py-3.5 text-ink-soft">
                {vehicle.location}
                <p className="text-[11px] text-muted">{vehicle.city}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-ink-soft">
                {inr(vehicle.fromPrice)}
              </td>
              <td className="px-5 py-3.5">
                <VehicleStatusText status={vehicle.status} />
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminPanel
        title="Documents"
        description="KYC, GST, RC and insurance submitted by this partner."
      >
        <AdminTable
          minWidth={820}
          head={["Type", "Title", "Expires", "Status", "File"]}
        >
          {partner.documents.length === 0 && (
            <AdminEmpty colSpan={5}>No documents uploaded by this partner.</AdminEmpty>
          )}
          {partner.documents.map((document) => (
            <tr key={document.id} className="transition hover:bg-page/60">
              <td className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
                {document.kind}
              </td>
              <td className="px-5 py-3.5 font-semibold text-ink">{document.title}</td>
              <td className="px-5 py-3.5 text-ink-soft">{when(document.expiresAt)}</td>
              <td className="px-5 py-3.5">
                <DocumentStatusBadge status={document.status} />
              </td>
              <td className="px-5 py-3.5 text-[12px] text-muted">
                {document.url ? (
                  <a
                    href={document.url}
                    className="font-semibold text-brand-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View file
                  </a>
                ) : (
                  "Not uploaded yet"
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminPanel title="Partner account" description="Contact and login details.">
        <form action={updatePartner} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="id" value={partner.id} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Field label="Trading name">
            <input name="tradingName" defaultValue={partner.tradingName} className={adminInput} />
          </Field>
          <Field label="Legal entity">
            <input name="legalName" defaultValue={partner.legalName ?? ""} className={adminInput} />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={partner.phone ?? ""} className={adminInput} />
          </Field>
          <Field label="City">
            <input name="city" defaultValue={partner.city} className={adminInput} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={partner.state} className={adminInput} />
          </Field>
          <Field label="GSTIN">
            <input name="gstin" defaultValue={partner.gstin ?? ""} maxLength={15} className={adminInput} />
          </Field>
          <Field label="Address" className="sm:col-span-2 lg:col-span-3">
            <input
              name="addressLine1"
              defaultValue={partner.addressLine1 ?? ""}
              className={adminInput}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <button className={adminButtonSoft} type="submit">
              Save partner details
            </button>
          </div>
        </form>
        <dl className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
          {[
            { label: "Login email", value: partner.email ?? "No email" },
            { label: "User status", value: partner.userStatus ?? "—" },
            { label: "Last login", value: when(partner.lastLoginAt) },
          ].map((row) => (
            <div key={row.label} className="bg-surface px-5 py-3.5">
              <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                {row.label}
              </dt>
              <dd className="mt-1 text-[13px] text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </AdminPanel>
    </AdminPage>
  );
}

function VehicleStatusText({ status }: { status: string }) {
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    ON_TRIP: "On trip",
    MAINTENANCE: "Maintenance",
    DRAFT: "Pending approval",
    RETIRED: "Retired",
  };
  return (
    <span className="text-[12.5px] font-semibold text-ink-soft">
      {labels[status] ?? status}
    </span>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, FileText, ShieldAlert, Upload, Wallet } from "lucide-react";
import {
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminInput,
  firstParam,
  when,
} from "@/components/admin/ui";
import { DocumentStatusBadge } from "@/components/portal/badges";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { AdminDocumentItem, ApiVehicle, Paginated } from "@/lib/api/types";
import { uploadDocument } from "../actions";

export const metadata: Metadata = { title: "My Documents" };

const KINDS = [
  { value: "KYC", label: "Partner KYC" },
  { value: "BUSINESS_REGISTRATION", label: "Business registration" },
  { value: "GST", label: "GST certificate" },
  { value: "VEHICLE_RC", label: "Vehicle RC book" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "PERMISSION", label: "Parking / operating permission" },
  { value: "OTHER", label: "Other paperwork" },
];

export default async function PartnerDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const [documents, fleet] = await Promise.all([
    vendorRequest<AdminDocumentItem[]>("/vendor/documents"),
    vendorRequest<Paginated<ApiVehicle>>("/vehicles/manage", { query: { limit: 100 } }),
  ]);

  const pending = documents.filter((row) => row.status === "PENDING").length;
  const approved = documents.filter((row) => row.status === "APPROVED").length;
  const expired = documents.filter((row) => row.status === "EXPIRED").length;
  const rejected = documents.filter((row) => row.status === "REJECTED").length;

  return (
    <AdminPage
      title="My Documents"
      description="Partner KYC, GST, RC and insurance paperwork for your fleet. Master Admin reviews everything you submit here; a vehicle cannot go live until its RC and insurance are approved."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/earnings" className={adminButton}>
          <Wallet className="size-4" /> Earnings
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Documents on file"
          value={String(documents.length)}
          hint="Only your own paperwork"
          icon={FileText}
        />
        <StatCard
          label="Awaiting review"
          value={String(pending)}
          hint="Submitted, Master Admin has not decided"
          icon={ShieldAlert}
          tint="butter"
        />
        <StatCard
          label="Approved"
          value={String(approved)}
          hint="Cleared for operations"
          icon={FileCheck2}
          tint="mint"
        />
        <StatCard
          label="Needs attention"
          value={String(expired + rejected)}
          hint={`${expired} expired · ${rejected} rejected`}
          icon={Upload}
          tint="peach"
        />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <AdminPanel
          title="Your paperwork"
          description="Expiry is read from the date you filed, so an approved document can turn to Expired on its own."
        >
          <AdminTable
            minWidth={780}
            head={["Document", "Type", "Linked vehicle", "Expires", "Status", "Review note"]}
          >
            {documents.length === 0 && (
              <AdminEmpty colSpan={6}>
                Nothing filed yet. Submit your GST certificate and each vehicle&apos;s RC and
                insurance so Master Admin can verify your fleet.
              </AdminEmpty>
            )}
            {documents.map((row) => (
              <tr key={row.id} className="align-top transition hover:bg-page/60">
                <td className="px-5 py-4">
                  <p className="text-[13px] font-semibold text-ink">{row.title}</p>
                  <p className="text-[11px] text-muted">
                    Filed {when(row.createdAt)}
                    {row.reference ? ` · ref ${row.reference}` : ""}
                  </p>
                  {row.url ? (
                    <Link
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-brand-700 hover:underline"
                    >
                      Open file
                    </Link>
                  ) : (
                    <p className="text-[11px] text-muted">No file stored against this row</p>
                  )}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {KINDS.find((kind) => kind.value === row.kind)?.label ?? row.kind}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {row.vehicleName ?? "Partner level"}
                  {row.registrationNumber && (
                    <p className="font-mono text-[11px] text-muted">{row.registrationNumber}</p>
                  )}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">{when(row.expiresAt)}</td>
                <td className="px-5 py-4">
                  <DocumentStatusBadge status={row.status} />
                </td>
                <td className="px-5 py-4 text-[11.5px] text-muted">
                  {row.reviewNote ?? "—"}
                  {row.reviewedByEmail && (
                    <p className="text-[11px]">Reviewed by {row.reviewedByEmail}</p>
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminPanel>

        <AdminPanel
          title="Submit a document"
          description="SavariGo stores the file link and the review decision; uploads are not held in this database."
        >
          <form action={uploadDocument} className="grid gap-3 p-5">
            <input type="hidden" name="redirectTo" value="/partner/documents" />
            <Field label="Document type">
              <select name="kind" required className={adminInput} defaultValue="KYC">
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" hint="For example: RC book — TN10AB1234">
              <input name="title" required minLength={3} maxLength={120} className={adminInput} />
            </Field>
            <Field
              label="File link"
              hint="A full https:// URL or a path on savarigo, eg /documents/rc.pdf"
            >
              <input name="url" required placeholder="/documents/rc-tn10ab1234.pdf" className={adminInput} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reference" hint="Certificate or policy number">
                <input name="reference" maxLength={60} className={adminInput} />
              </Field>
              <Field label="Expires on">
                <input type="date" name="expiresAt" className={adminInput} />
              </Field>
            </div>
            <Field
              label="Linked vehicle"
              hint="Required for RC, insurance and permission documents."
            >
              <select name="vehicleId" className={adminInput} defaultValue="">
                <option value="">Partner level — not a vehicle</option>
                {fleet.data.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} · {vehicle.registrationNumber ?? "no plate"}
                  </option>
                ))}
              </select>
            </Field>
            <p className="rounded-xl border border-line bg-page/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
              New rows always start as <strong>Awaiting review</strong>. Only Master Admin can
              approve, reject or expire them — partners cannot verify their own paperwork.
            </p>
            <button className={adminButton} type="submit">
              <Upload className="size-4" /> Submit for verification
            </button>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}

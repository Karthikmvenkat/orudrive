import type { Metadata } from "next";
import Link from "next/link";
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
  when,
} from "@/components/admin/ui";
import { DocumentStatusBadge } from "@/components/portal/badges";
import { PortalTabs } from "@/components/portal/ui";
import { staffRequest } from "@/lib/api/server";
import type { AdminDocumentItem, Paginated } from "@/lib/api/types";
import { verifyDocument } from "../actions";

export const metadata: Metadata = { title: "Document Verification" };

const STATUSES = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Awaiting review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "EXPIRED", label: "Expired" },
];

const KINDS = [
  "KYC",
  "BUSINESS_REGISTRATION",
  "GST",
  "VEHICLE_RC",
  "INSURANCE",
  "PERMISSION",
  "OTHER",
];

type Queue = Paginated<AdminDocumentItem> & { pendingCount: number };

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const kind = firstParam(params.kind) ?? "";
  const q = firstParam(params.q);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const queue = await staffRequest<Queue>("/admin/documents", {
    query: { status: status || undefined, kind: kind || undefined, q, page, limit: 20 },
  });

  const query: Record<string, string | undefined> = {
    status: status || undefined,
    kind: kind || undefined,
    q,
  };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const redirectTo = search ? `/admin/documents?${search}` : "/admin/documents";

  return (
    <AdminPage
      title="Document Verification"
      description="KYC, GST, RC, insurance and permits submitted by rental partners. Nothing publishes until the paperwork here is approved."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/admin/partners?status=PENDING" className={adminButtonSoft}>
          Partner approvals
        </Link>
      }
    >
      <PortalTabs
        tabs={STATUSES.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count:
            tab.key === ""
              ? queue.meta.total
              : tab.key === "PENDING"
                ? queue.pendingCount
                : undefined,
        }))}
        active={status}
        basePath="/admin/documents"
        param="status"
        search={query}
      />

      <AdminPanel
        title={`${queue.meta.total} documents`}
        description={`${queue.pendingCount} in the pending queue across all partners.`}
      >
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <Field label="Search" className="w-56">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Title, reference, partner or registration"
              className={adminInput}
            />
          </Field>
          <Field label="Type" className="w-44">
            <select name="kind" defaultValue={kind} className={adminInput}>
              <option value="">All types</option>
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
          {(q || kind) && (
            <Link href={`/admin/documents?status=${status}`} className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1240}
          head={["Document", "Partner", "Vehicle", "Reference", "Expires", "Status", "Decision", "Actions"]}
        >
          {queue.data.length === 0 && (
            <AdminEmpty colSpan={8}>No documents match these filters.</AdminEmpty>
          )}
          {queue.data.map((document) => (
            <tr key={document.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{document.title}</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  {document.kind.replaceAll("_", " ")}
                </p>
              </td>
              <td className="px-5 py-4 text-[12.5px] text-ink-soft">
                <Link
                  href={`/admin/partners/${document.vendorId}`}
                  className="font-semibold text-ink hover:text-brand-700"
                >
                  {document.vendorName}
                </Link>
                <p className="text-[11px] text-muted">
                  {document.partnerCode} · {document.vendorCity}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {document.vehicleName ?? "Partner level"}
                {document.registrationNumber && (
                  <p className="font-mono text-[11px] text-muted">
                    {document.registrationNumber}
                  </p>
                )}
              </td>
              <td className="px-5 py-4 font-mono text-[11.5px] text-ink-soft">
                {document.reference ?? "—"}
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {when(document.expiresAt)}
                <p className="text-[11px] text-muted">Uploaded {when(document.createdAt)}</p>
              </td>
              <td className="px-5 py-4">
                <DocumentStatusBadge status={document.status} />
              </td>
              <td className="px-5 py-4 text-[11.5px] text-muted">
                {document.reviewedByEmail ? (
                  <>
                    <p>{document.reviewedByEmail}</p>
                    <p>{when(document.reviewedAt)}</p>
                  </>
                ) : (
                  "Not reviewed"
                )}
                {document.reviewNote && (
                  <p className="mt-1 max-w-[220px] leading-snug text-ink-soft">
                    {document.reviewNote}
                  </p>
                )}
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  {document.status !== "APPROVED" && (
                    <form action={verifyDocument}>
                      <input type="hidden" name="id" value={document.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <input
                        type="hidden"
                        name="note"
                        value="Verified against the uploaded copy."
                      />
                      <button className={adminButtonSoft} type="submit">
                        Approve
                      </button>
                    </form>
                  )}
                  {document.status !== "REJECTED" && (
                    <form action={verifyDocument}>
                      <input type="hidden" name="id" value={document.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <input
                        type="hidden"
                        name="note"
                        value="Unclear or mismatched copy — re-upload requested."
                      />
                      <button className={adminButtonDanger} type="submit">
                        Reject
                      </button>
                    </form>
                  )}
                  {document.status !== "EXPIRED" && (
                    <form action={verifyDocument}>
                      <input type="hidden" name="id" value={document.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="status" value="EXPIRED" />
                      <input type="hidden" name="note" value="Marked expired by Master Admin." />
                      <button
                        className="text-[12px] font-semibold text-ink-soft hover:underline"
                        type="submit"
                      >
                        Expire
                      </button>
                    </form>
                  )}
                  {!document.url && (
                    <span className="text-[11px] text-muted">No file attached</span>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={queue.meta.page}
          totalPages={queue.meta.totalPages}
          path="/admin/documents"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

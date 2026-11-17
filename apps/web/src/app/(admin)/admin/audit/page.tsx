import type { Metadata } from "next";
import { staffRequest } from "@/lib/api/server";
import type { AdminAuditLog, Paginated } from "@/lib/api/types";
import {
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminInput,
  firstParam,
  whenTime,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const entityType = firstParam(params.entityType);
  const action = firstParam(params.action);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const logs = await staffRequest<Paginated<AdminAuditLog>>("/admin/audit-logs", {
    query: { entityType, action, page, limit: 30 },
  });

  const query: Record<string, string | undefined> = { entityType, action };

  return (
    <AdminPage
      title="Audit log"
      description="Every authenticated mutation, newest first."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Field label="Entity" className="w-36">
            <input
              name="entityType"
              defaultValue={entityType ?? ""}
              placeholder="bookings"
              className={adminInput}
            />
          </Field>
          <Field label="Action contains" className="w-60">
            <input
              name="action"
              defaultValue={action ?? ""}
              placeholder="PATCH /bookings"
              className={adminInput}
            />
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
        </form>
      }
    >
      <AdminPanel title={`${logs.meta.total} entries`}>
        <AdminTable
          minWidth={1000}
          head={["When", "Actor", "Action", "Entity", "IP", "User agent"]}
        >
          {logs.data.length === 0 && (
            <AdminEmpty colSpan={6}>No audit entries match these filters.</AdminEmpty>
          )}
          {logs.data.map((log) => (
            <tr key={log.id} className="align-top">
              <td className="whitespace-nowrap px-5 py-4 text-[12px] text-ink-soft">
                {whenTime(log.createdAt)}
              </td>
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">
                  {log.actorName ?? log.actorEmail ?? "System"}
                </p>
                <p className="text-[11px] text-muted">{log.actorEmail ?? "—"}</p>
              </td>
              <td className="max-w-[280px] px-5 py-4">
                <code className="block whitespace-pre-wrap break-words text-[11px] text-ink-soft">
                  {log.action}
                </code>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {log.entityType}
                {log.entityId && (
                  <p className="font-mono text-[10px] text-muted">
                    {log.entityId.slice(0, 12)}…
                  </p>
                )}
              </td>
              <td className="px-5 py-4 font-mono text-[11px] text-muted">
                {log.ipAddress ?? "—"}
              </td>
              <td className="max-w-[220px] px-5 py-4 text-[11px] text-muted">
                <span className="line-clamp-2">{log.userAgent ?? "—"}</span>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={logs.meta.page}
          totalPages={logs.meta.totalPages}
          path="/admin/audit"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

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
  adminButtonSoft,
  adminInput,
  adminTextarea,
  firstParam,
  whenTime,
} from "@/components/admin/ui";
import {
  TicketCategoryLabel,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/portal/badges";
import { PortalTabs } from "@/components/portal/ui";
import { staffRequest } from "@/lib/api/server";
import type {
  AdminTicketItem,
  Paginated,
  SupportTicketCounts,
} from "@/lib/api/types";
import { replyTicket, updateTicket } from "../actions";

export const metadata: Metadata = { title: "Support & Complaints" };

const STATUSES = [
  { key: "", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

const CATEGORIES = ["BOOKING", "PAYMENT", "VEHICLE", "PARTNER", "ACCOUNT", "OTHER"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const category = firstParam(params.category) ?? "";
  const priority = firstParam(params.priority) ?? "";
  const q = firstParam(params.q);
  const page = Number(firstParam(params.page) ?? "1") || 1;
  const open = firstParam(params.ticket);

  const [tickets, counts] = await Promise.all([
    staffRequest<Paginated<AdminTicketItem>>("/admin/tickets", {
      query: {
        status: status || undefined,
        category: category || undefined,
        priority: priority || undefined,
        q,
        page,
        limit: 20,
      },
    }),
    staffRequest<SupportTicketCounts>("/admin/tickets/counts"),
  ]);

  const query: Record<string, string | undefined> = {
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
    q,
  };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const redirectTo = search ? `/admin/support?${search}` : "/admin/support";

  return (
    <AdminPage
      title="Support & Complaints"
      description="Rider and partner tickets in one queue. Replying moves a ticket to In progress automatically."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/admin/notifications" className={adminButtonSoft}>
          Broadcast a notice
        </Link>
      }
    >
      <PortalTabs
        tabs={STATUSES.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: tab.key ? (counts.byStatus[tab.key] ?? 0) : counts.total,
        }))}
        active={status}
        basePath="/admin/support"
        param="status"
        search={query}
      />

      <AdminPanel
        title={`${tickets.meta.total} tickets`}
        description={`${counts.open} open · ${counts.inProgress} in progress · ${counts.resolved} resolved`}
      >
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <Field label="Search" className="w-52">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Subject, code or message"
              className={adminInput}
            />
          </Field>
          <Field label="Category" className="w-40">
            <select name="category" defaultValue={category} className={adminInput}>
              <option value="">All</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" className="w-40">
            <select name="priority" defaultValue={priority} className={adminInput}>
              <option value="">All</option>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
          {(q || category || priority) && (
            <Link href={`/admin/support?status=${status}`} className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable
          minWidth={1180}
          head={["Ticket", "Raised by", "Category", "Priority", "Status", "Updated", "Actions"]}
        >
          {tickets.data.length === 0 && (
            <AdminEmpty colSpan={7}>No tickets match these filters.</AdminEmpty>
          )}
          {tickets.data.map((ticket) => {
            const expanded = open === ticket.id;
            return (
              <tr key={ticket.id} className="align-top">
                <td className="px-5 py-4">
                  <details open={expanded}>
                    <summary className="cursor-pointer list-none">
                      <p className="font-semibold text-ink">{ticket.subject}</p>
                      <p className="text-[11px] font-mono text-muted">
                        {ticket.code} · {ticket.messageCount} message
                        {ticket.messageCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 max-w-[340px] truncate text-[11.5px] text-ink-soft">
                        {ticket.lastMessage}
                      </p>
                      <span className="mt-1.5 inline-block text-[11.5px] font-semibold text-brand-700">
                        {expanded ? "Hide thread" : "Open thread"}
                      </span>
                    </summary>
                    <div className="mt-3 w-[520px] space-y-3 rounded-xl border border-line bg-page/50 p-4">
                      {ticket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={
                            message.isFromStaff
                              ? "rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 py-2.5"
                              : "rounded-xl border border-line bg-surface px-3.5 py-2.5"
                          }
                        >
                          <p className="text-[12.5px] leading-relaxed text-ink">
                            {message.body}
                          </p>
                          <p className="mt-1 text-[10.5px] text-muted">
                            {message.isFromStaff ? "SavariGo staff" : (message.authorEmail ?? "Rider")}
                            {" · "}
                            {whenTime(message.createdAt)}
                          </p>
                        </div>
                      ))}
                      <form action={replyTicket} className="space-y-2">
                        <input type="hidden" name="id" value={ticket.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <textarea
                          name="body"
                          required
                          minLength={2}
                          maxLength={2000}
                          rows={2}
                          placeholder="Reply to this ticket"
                          className={adminTextarea}
                        />
                        <button className={adminButtonSoft} type="submit">
                          Send reply
                        </button>
                      </form>
                    </div>
                  </details>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {ticket.customerName ?? ticket.partnerName ?? "Unknown"}
                  <p className="text-[11px] text-muted">
                    {ticket.customerEmail ?? "—"}
                    {ticket.partnerCode && <span> · {ticket.partnerCode}</span>}
                  </p>
                  {ticket.bookingCode && (
                    <Link
                      href={`/admin/bookings?q=${encodeURIComponent(ticket.bookingCode)}`}
                      className="mt-1 block text-[11px] font-semibold text-brand-700 hover:underline"
                    >
                      {ticket.bookingCode}
                    </Link>
                  )}
                </td>
                <td className="px-5 py-4">
                  <TicketCategoryLabel category={ticket.category} />
                </td>
                <td className="px-5 py-4">
                  <TicketPriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-5 py-4">
                  <TicketStatusBadge status={ticket.status} />
                  {ticket.closedAt && (
                    <p className="mt-1 text-[11px] text-muted">Closed {whenTime(ticket.closedAt)}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[12px] text-muted">
                  {whenTime(ticket.updatedAt)}
                </td>
                <td className="px-5 py-4">
                  <AdminAction>
                    {ticket.status !== "RESOLVED" && (
                      <form action={updateTicket}>
                        <input type="hidden" name="id" value={ticket.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="status" value="RESOLVED" />
                        <button className={adminButtonSoft} type="submit">
                          Resolve
                        </button>
                      </form>
                    )}
                    {ticket.status !== "CLOSED" && (
                      <form action={updateTicket}>
                        <input type="hidden" name="id" value={ticket.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="status" value="CLOSED" />
                        <button
                          className="text-[12px] font-semibold text-ink-soft hover:underline"
                          type="submit"
                        >
                          Close
                        </button>
                      </form>
                    )}
                    {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
                      <form action={updateTicket}>
                        <input type="hidden" name="id" value={ticket.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="status" value="OPEN" />
                        <button
                          className="text-[12px] font-semibold text-brand-700 hover:underline"
                          type="submit"
                        >
                          Reopen
                        </button>
                      </form>
                    )}
                  </AdminAction>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <AdminPager
          page={tickets.meta.page}
          totalPages={tickets.meta.totalPages}
          path="/admin/support"
          params={{ ...query, ticket: undefined }}
        />
      </AdminPanel>
    </AdminPage>
  );
}

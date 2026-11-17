import type { Metadata } from "next";
import Link from "next/link";
import { Headset, LifeBuoy, MessageSquarePlus, Send } from "lucide-react";
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
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { AdminTicketItem, Paginated, SupportTicketCounts } from "@/lib/api/types";
import { createTicket, replyTicket } from "../actions";

export const metadata: Metadata = { title: "Support" };

const FILTERS = [
  { key: "", label: "All tickets" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

const CATEGORIES = ["BOOKING", "PAYMENT", "VEHICLE", "PARTNER", "ACCOUNT", "OTHER"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default async function PartnerSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status) ?? "";
  const category = firstParam(params.category) ?? "";
  const priority = firstParam(params.priority) ?? "";
  const q = firstParam(params.q);
  const booking = firstParam(params.booking);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const tickets = await vendorRequest<Paginated<AdminTicketItem>>("/support/tickets", {
    query: {
      status: status || undefined,
      category: category || undefined,
      priority: priority || undefined,
      q,
      page,
      limit: 15,
    },
  });

  const query: Record<string, string | undefined> = {
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
    q,
  };

  return (
    <AdminPage
      title="Support"
      description="Raise an issue with the SavariGo partner desk — payouts, a vehicle that will not clear approval, or a rider dispute. Staff replies land here and in your notifications."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
    >
      <StatGrid columns={3}>
        <StatCard
          label="Tickets raised"
          value={String(tickets.meta.total)}
          hint="Your own partner tickets"
          icon={LifeBuoy}
        />
        <StatCard
          label="Threads on this page"
          value={String(tickets.data.reduce((sum, row) => sum + row.messageCount, 0))}
          hint="Messages between you and the desk"
          icon={MessageSquarePlus}
          tint="sky"
        />
        <StatCard
          label="Needing a reply"
          value={String(
            tickets.data.filter((row) => row.status === "OPEN" || row.status === "IN_PROGRESS")
              .length,
          )}
          hint="Open or in progress on this page"
          icon={Headset}
          tint="butter"
        />
      </StatGrid>

      <AdminPanel
        title="Raise a ticket"
        description="Booking-related issues are fastest when you quote the SVR code — the desk can then see the rental, the payment and your vehicle in one place."
      >
        <form action={createTicket} className="grid gap-3 p-5 lg:grid-cols-2">
          <input type="hidden" name="redirectTo" value="/partner/support" />
          <Field label="Subject" hint="5–160 characters">
            <input name="subject" required minLength={5} maxLength={160} className={adminInput} />
          </Field>
          <Field label="Booking or SVR code" hint="Optional reference">
            <input
              name="bookingRef"
              maxLength={60}
              defaultValue={booking ?? ""}
              placeholder="SVR603813"
              className={adminInput}
            />
          </Field>
          <Field label="Category">
            <select name="category" required className={adminInput} defaultValue="PARTNER">
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" className={adminInput} defaultValue="NORMAL">
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What happened?" className="lg:col-span-2" hint="At least 10 characters">
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={4000}
              rows={4}
              className={adminTextarea}
              placeholder="The RC for TY01AB1234 was uploaded on 3 November but is still showing Awaiting review."
            />
          </Field>
          <div className="lg:col-span-2">
            <button className={adminButton} type="submit">
              <Send className="size-4" /> Send to the partner desk
            </button>
          </div>
        </form>
      </AdminPanel>

      <PortalTabs
        tabs={FILTERS.map((filter) => ({ key: filter.key, label: filter.label }))}
        active={status}
        basePath="/partner/support"
        param="status"
        search={query}
      />

      <AdminPanel title={`${tickets.meta.total} ticket${tickets.meta.total === 1 ? "" : "s"}`}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <input type="hidden" name="status" value={status} />
          <Field label="Search" className="w-52">
            <input name="q" defaultValue={q ?? ""} placeholder="Subject or message" className={adminInput} />
          </Field>
          <Field label="Category" className="w-44">
            <select name="category" defaultValue={category} className={adminInput}>
              <option value="">Any category</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" className="w-40">
            <select name="priority" defaultValue={priority} className={adminInput}>
              <option value="">Any priority</option>
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
            <Link href={`/partner/support?status=${status}`} className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable minWidth={980} head={["Ticket", "Subject", "Category", "Priority", "Latest", ""]}>
          {tickets.data.length === 0 && (
            <AdminEmpty colSpan={6}>
              {tickets.meta.total === 0
                ? "You have not raised a ticket yet. Use the form above and the desk will reply in this thread."
                : "No ticket matches these filters."}
            </AdminEmpty>
          )}
          {tickets.data.map((row) => (
            <tr key={row.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-4">
                <p className="font-mono text-[12px] font-semibold text-ink">{row.code}</p>
                <p className="mt-0.5 text-[11px] text-muted">Opened {whenTime(row.createdAt)}</p>
                <div className="mt-1.5">
                  <TicketStatusBadge status={row.status} />
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="text-[13px] font-semibold text-ink">{row.subject}</p>
                {row.bookingCode && (
                  <p className="text-[11px] text-muted">Booking {row.bookingCode}</p>
                )}
              </td>
              <td className="px-5 py-4">
                <TicketCategoryLabel category={row.category} />
              </td>
              <td className="px-5 py-4">
                <TicketPriorityBadge priority={row.priority} />
              </td>
              <td className="px-5 py-4">
                <p className="max-w-sm text-[12px] leading-relaxed text-ink-soft">
                  {row.lastMessage || "No message yet"}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {row.messageCount} message{row.messageCount === 1 ? "" : "s"}
                </p>
              </td>
              <td className="px-5 py-4">
                <AdminAction className="justify-end">
                  <details className="group">
                    <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-full border border-line bg-surface px-4 text-[12px] font-semibold text-ink-soft transition hover:border-brand-300">
                      Thread
                    </summary>
                    <ul className="mt-3 max-w-md space-y-2 rounded-xl border border-line bg-page/60 p-3 text-left">
                      {row.messages.map((message) => (
                        <li
                          key={message.id}
                          className={
                            message.isFromStaff
                              ? "rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-2"
                              : "rounded-lg border border-line bg-surface px-3 py-2"
                          }
                        >
                          <p className="text-[11px] font-bold text-ink-soft">
                            {message.isFromStaff
                              ? `SavariGo desk · ${message.authorEmail ?? ""}`
                              : "You"}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink">{message.body}</p>
                          <p className="mt-1 text-[10.5px] text-muted">{whenTime(message.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                    <form action={replyTicket} className="mt-3 max-w-md space-y-2 text-left">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="redirectTo" value="/partner/support" />
                      <Field label="Reply">
                        <textarea
                          name="body"
                          required
                          minLength={2}
                          maxLength={4000}
                          rows={3}
                          className={adminTextarea}
                        />
                      </Field>
                      <button className={adminButtonSoft} type="submit">
                        Send reply
                      </button>
                    </form>
                  </details>
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={tickets.meta.page}
          totalPages={tickets.meta.totalPages}
          path="/partner/support"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

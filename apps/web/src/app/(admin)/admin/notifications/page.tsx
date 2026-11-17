import type { Metadata } from "next";
import Link from "next/link";
import {
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
import { Badge } from "@/components/ui/badge";
import { staffRequest } from "@/lib/api/server";
import type { AdminNotificationItem, Paginated } from "@/lib/api/types";
import { broadcastNotification } from "../actions";

export const metadata: Metadata = { title: "Notifications" };

const TYPES = [
  "OFFER",
  "SYSTEM",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "PAYMENT_RECEIVED",
  "REFUND_PROCESSED",
  "PICKUP_REMINDER",
];

const CHANNELS = ["IN_APP", "EMAIL", "SMS", "WHATSAPP"];
const ROLES = ["CUSTOMER", "DRIVER", "VENDOR", "SUPPORT", "ADMIN"];

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = firstParam(params.type) ?? "";
  const channel = firstParam(params.channel) ?? "";
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const history = await staffRequest<Paginated<AdminNotificationItem>>("/notifications/manage", {
    query: { type: type || undefined, channel: channel || undefined, page, limit: 20 },
  });

  const query: Record<string, string | undefined> = {
    type: type || undefined,
    channel: channel || undefined,
  };

  return (
    <AdminPage
      title="Notifications"
      description="Broadcast an offer or system notice to every account holding a role, then audit what actually went out."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/admin/reports" className={adminButtonSoft}>
          Open reports
        </Link>
      }
    >
      <AdminPanel
        title="Send a broadcast"
        description="One row is written per recipient. Email uses SMTP; if mail is not configured the row is recorded as Failed rather than silently dropped."
      >
        <form
          action={broadcastNotification}
          className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="redirectTo" value="/admin/notifications" />
          <Field label="Audience" hint="Every user holding this role">
            <select name="role" required defaultValue="CUSTOMER" className={adminInput}>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select name="type" defaultValue="OFFER" className={adminInput}>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select name="channel" defaultValue="IN_APP" className={adminInput}>
              {CHANNELS.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input name="title" required minLength={2} maxLength={120} className={adminInput} />
          </Field>
          <Field label="Message" className="sm:col-span-2 lg:col-span-4">
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={2000}
              rows={3}
              placeholder="Diwali fleet offer — 15% off two-wheelers in Puducherry until 5 November."
              className={adminTextarea}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <button className={adminButton} type="submit">
              Send broadcast
            </button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title={`${history.meta.total} sent notifications`}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <Field label="Type" className="w-48">
            <select name="type" defaultValue={type} className={adminInput}>
              <option value="">All types</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel" className="w-40">
            <select name="channel" defaultValue={channel} className={adminInput}>
              <option value="">All channels</option>
              {CHANNELS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
          {(type || channel) && (
            <Link href="/admin/notifications" className={adminButtonSoft}>
              Clear
            </Link>
          )}
        </form>

        <AdminTable minWidth={940} head={["Title", "Message", "Recipient", "Type", "Channel", "Status", "Sent"]}>
          {history.data.length === 0 && (
            <AdminEmpty colSpan={7}>Nothing has been sent yet.</AdminEmpty>
          )}
          {history.data.map((row) => (
            <tr key={row.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-3.5 font-semibold text-ink">{row.title}</td>
              <td className="px-5 py-3.5 text-[12px] text-ink-soft">
                <p className="max-w-[320px] truncate">{row.body}</p>
              </td>
              <td className="px-5 py-3.5 text-[12px] text-muted">{row.userEmail}</td>
              <td className="px-5 py-3.5">
                <Badge variant={row.type === "OFFER" ? "success" : "neutral"} size="sm">
                  {row.type.replaceAll("_", " ")}
                </Badge>
              </td>
              <td className="px-5 py-3.5 text-[12px] uppercase tracking-[0.05em] text-muted">
                {row.channel}
              </td>
              <td className="px-5 py-3.5">
                <Badge
                  variant={
                    row.status === "FAILED" ? "danger" : row.status === "PENDING" ? "warning" : "info"
                  }
                  size="sm"
                >
                  {row.status}
                </Badge>
                <p className="mt-1 text-[11px] text-muted">{row.isRead ? "Read" : "Unread"}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-[12px] text-muted">
                {whenTime(row.sentAt ?? row.createdAt)}
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={history.meta.page}
          totalPages={history.meta.totalPages}
          path="/admin/notifications"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

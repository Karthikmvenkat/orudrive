import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import {
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
  whenTime,
} from "@/components/admin/ui";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { ApiNotification, Paginated } from "@/lib/api/types";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "../actions";

export const metadata: Metadata = { title: "Notifications" };

const TYPES = [
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "PAYMENT_RECEIVED",
  "REFUND_PROCESSED",
  "PICKUP_REMINDER",
  "OFFER",
  "SYSTEM",
];

const TYPE_LABEL: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking confirmed",
  BOOKING_CANCELLED: "Booking cancelled",
  PAYMENT_RECEIVED: "Payment received",
  REFUND_PROCESSED: "Refund processed",
  PICKUP_REMINDER: "Pickup reminder",
  OFFER: "Offer",
  SYSTEM: "System",
};

export default async function PartnerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = firstParam(params.type) ?? "";
  const unread = firstParam(params.unread) === "true";
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const inbox = await vendorRequest<Paginated<ApiNotification>>("/notifications", {
    query: { type: type || undefined, unread: unread ? "true" : undefined, page, limit: 25 },
  });

  const query: Record<string, string | undefined> = {
    type: type || undefined,
    unread: unread ? "true" : undefined,
  };

  return (
    <AdminPage
      title="Notifications"
      description="Everything SavariGo has sent to your partner account — booking decisions, payment records, document reviews and broadcasts from Master Admin."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form action={markAllNotificationsRead}>
          <input type="hidden" name="redirectTo" value="/partner/notifications" />
          <button className={adminButton} type="submit">
            <CheckCheck className="size-4" /> Mark all read
          </button>
        </form>
      }
    >
      <StatGrid columns={3}>
        <StatCard
          label="Messages"
          value={String(inbox.meta.total)}
          hint={unread ? "Unread only, with the filter applied" : "All types, read and unread"}
          icon={Bell}
        />
        <StatCard
          label="Unread on this page"
          value={String(inbox.data.filter((row) => !row.isRead).length)}
          hint="New since you last checked"
          icon={BellRing}
          tint="butter"
        />
        <StatCard
          label="Broadcast reach"
          value={String(inbox.data.filter((row) => row.type === "OFFER").length)}
          hint="Offer messages on this page"
          icon={CheckCheck}
          tint="sky"
        />
      </StatGrid>

      <AdminPanel title="Inbox">
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-4" method="get">
          <Field label="Type" className="w-52">
            <select name="type" defaultValue={type} className={adminInput}>
              <option value="">All types</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABEL[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Read state" className="w-40">
            <select name="unread" defaultValue={unread ? "true" : ""} className={adminInput}>
              <option value="">Everything</option>
              <option value="true">Unread only</option>
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Apply
          </button>
          {(type || unread) && (
            <Link href="/partner/notifications" className={adminButtonSoft}>
              Reset
            </Link>
          )}
        </form>

        <AdminTable minWidth={860} head={["Message", "Type", "Channel", "Sent", "State", ""]}>
          {inbox.data.length === 0 && (
            <AdminEmpty colSpan={6}>
              {unread
                ? "Nothing unread with these filters."
                : "No notification has been sent to this partner account yet."}
            </AdminEmpty>
          )}
          {inbox.data.map((row) => (
            <tr key={row.id} className="align-top transition hover:bg-page/60">
              <td className="px-5 py-4">
                <p className="text-[13px] font-semibold text-ink">{row.title}</p>
                <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-ink-soft">
                  {row.body}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {TYPE_LABEL[row.type] ?? row.type}
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">{row.channel}</td>
              <td className="px-5 py-4 text-[12px] text-muted">{whenTime(row.createdAt)}</td>
              <td className="px-5 py-4">
                {row.isRead ? (
                  <span className="text-[11.5px] text-muted">Read {whenTime(row.readAt)}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <span className="size-1.5 rounded-full bg-amber-500" /> Unread
                  </span>
                )}
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!row.isRead && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="redirectTo" value="/partner/notifications" />
                      <button className={adminButtonSoft} type="submit">
                        Mark read
                      </button>
                    </form>
                  )}
                  <form action={deleteNotification}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="redirectTo" value="/partner/notifications" />
                    <button className={adminButtonDanger} type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={inbox.meta.page}
          totalPages={inbox.meta.totalPages}
          path="/partner/notifications"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}

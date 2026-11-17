"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Heart,
  LogOut,
  ReceiptText,
  Search,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem as Item,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlay";
import { MobileDashboardNav } from "@/components/dashboard/sidebar";
import { useSession } from "@/lib/session";
import type { ApiMe, ApiNotification } from "@/lib/api/types";
import { cn, initials } from "@/lib/utils";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/bookings": "My Bookings",
  "/dashboard/saved": "Saved Vehicles",
  "/dashboard/payments": "Payments",
  "/dashboard/profile": "Profile",
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function displayName(user: ApiMe) {
  return user.customerProfile?.fullName ?? user.email.split("@")[0];
}

export function DashboardTopbar({ user }: { user: ApiMe }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const title = titles[pathname] ?? "Dashboard";
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/proxy/notifications?limit=6", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: ApiNotification[] };
        if (!cancelled) setNotifications(payload.data ?? []);
      } catch {
        // The bell simply stays empty when notifications are unavailable.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const markAllRead = async () => {
    setNotifications((rows) => rows.map((row) => ({ ...row, isRead: true })));
    await fetch("/api/proxy/notifications/read-all", { method: "PATCH" }).catch(
      () => undefined,
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <MobileDashboardNav user={user} />

        <div className="min-w-0 lg:hidden">
          <p className="truncate text-[14px] font-bold text-ink">{title}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/dashboard/bookings");
          }}
          className="relative ml-auto hidden w-full max-w-[320px] sm:block lg:ml-0"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings, vehicles…"
            aria-label="Search your bookings"
            className="h-10 w-full rounded-full border border-line bg-page/70 pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-brand-300 focus:bg-white"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-page"
                aria-label="Notifications"
              >
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-0">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-[13px] font-bold text-ink">Notifications</p>
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    {unread} new · mark read
                  </button>
                ) : (
                  <span className="text-[11px] text-muted">All caught up</span>
                )}
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="px-4 py-6 text-center text-[12px] text-muted">
                    No notifications yet.
                  </li>
                )}
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-line/70 px-4 py-3 last:border-0",
                      !n.isRead && "bg-brand-50/40",
                    )}
                  >
                    <p className="text-[12.5px] font-semibold text-ink">{n.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{n.body}</p>
                    <p className="mt-1 text-[10.5px] text-muted/80">{timeAgo(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-page"
                aria-label="Account menu"
              >
                <Avatar className="size-9">
                  <AvatarFallback>{initials(displayName(user))}</AvatarFallback>
                </Avatar>
                <span className="hidden text-[12.5px] font-semibold text-ink sm:block">
                  {displayName(user).split(" ")[0]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-[13px] font-bold text-ink">{displayName(user)}</p>
                <p className="text-[11.5px] text-muted">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <Item asChild>
                <Link href="/dashboard/profile">
                  <UserRound className="size-4 text-muted" /> Profile
                </Link>
              </Item>
              <Item asChild>
                <Link href="/dashboard/bookings">
                  <CalendarDays className="size-4 text-muted" /> My bookings
                </Link>
              </Item>
              <Item asChild>
                <Link href="/dashboard/saved">
                  <Heart className="size-4 text-muted" /> Saved vehicles
                </Link>
              </Item>
              <Item asChild>
                <Link href="/dashboard/payments">
                  <ReceiptText className="size-4 text-muted" /> Payments
                </Link>
              </Item>
              <DropdownMenuSeparator />
              <Item onSelect={() => void signOut()}>
                <LogOut className="size-4 text-muted" /> Sign out
              </Item>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

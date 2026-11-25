"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  CarFront,
  ChevronRight,
  ClipboardList,
  Coins,
  FileCheck2,
  FileClock,
  Gauge,
  Globe,
  Headset,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPinned,
  Settings,
  Star,
  Tags,
  Ticket,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/overlay";
import { Logo } from "@/components/shared/logo";
import { useSession } from "@/lib/session";
import { cn, initials } from "@/lib/utils";
import type { ApiMe } from "@/lib/api/types";

/**
 * Nav data arrives from a Server Component, which may only pass plain values,
 * so links name their icon and the icon itself is resolved here.
 */
const ICONS = {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  CarFront,
  ClipboardList,
  Coins,
  FileCheck2,
  FileClock,
  Gauge,
  Headset,
  History,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  Settings,
  Star,
  Tags,
  Ticket,
  UserCog,
  Users,
  Wallet,
} as const;

export type PortalIconName = keyof typeof ICONS;

export interface PortalNavLink {
  label: string;
  href: string;
  icon: PortalIconName;
  external?: boolean;
  badge?: number;
}

export interface PortalNavGroup {
  group: string;
  links: PortalNavLink[];
}

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/partner") return false;
  return pathname.startsWith(`${href}/`);
}

/** Only one item in a flat list should win: the longest matching prefix. */
function isCurrent(pathname: string, href: string, nav: PortalNavLink[]) {
  if (!isActive(pathname, href)) return false;
  const better = nav.find(
    (link) => !link.external && link.href !== href && isActive(pathname, link.href)
      && link.href.length > href.length,
  );
  return !better;
}

function displayName(user: ApiMe) {
  return user.customerProfile?.fullName ?? user.email.split("@")[0];
}

export function PortalShell({
  user,
  nav,
  titles,
  brandLabel,
  roleLabel,
  homeHref,
  notificationsHref,
  secondaryLinks = [],
  externalLinks = [],
  children,
}: {
  user: ApiMe;
  nav: PortalNavGroup[];
  titles: Record<string, string>;
  brandLabel: string;
  roleLabel: string;
  homeHref: string;
  notificationsHref: string;
  secondaryLinks?: PortalNavLink[];
  externalLinks?: PortalNavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);

  const flatLinks = nav.flatMap((group) => group.links);
  const title =
    titles[pathname] ??
    flatLinks.find((link) => isCurrent(pathname, link.href, flatLinks))?.label ??
    roleLabel;

  const sidebar = (
    <>
      <div className="flex items-start justify-between gap-2 px-3">
        <Link href={homeHref} className="block" aria-label={`${brandLabel} home`}>
          <span className="text-[18px] font-extrabold tracking-[-0.02em] text-white">
            {brandLabel.split(" ")[0]}{" "}
            <span className="text-brand-400">{brandLabel.split(" ").slice(1).join(" ")}</span>
          </span>
          <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
            {roleLabel}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid size-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="mt-6 space-y-5 overflow-y-auto px-1">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
              {group.group}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {group.links.map((link) => {
                const active = isCurrent(pathname, link.href, flatLinks);
                const Icon = ICONS[link.icon];
                const content = (
                  <>
                    <Icon
                      className={cn(
                        "size-[17px] shrink-0",
                        active ? "text-brand-300" : "text-white/50",
                      )}
                      strokeWidth={active ? 2.1 : 1.9}
                    />
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    {link.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          active ? "bg-brand-400 text-forest" : "bg-white/12 text-ink/70",
                        )}
                      >
                        {link.badge}
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        {content}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                          active
                            ? "bg-white/12 font-semibold text-white shadow-[inset_2px_0_0_0_var(--color-brand-400)]"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {secondaryLinks.length > 0 && (
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
              More
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {secondaryLinks.map((link) => {
                const Icon = ICONS[link.icon];
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                        isActive(pathname, link.href)
                          ? "bg-white/12 font-semibold text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[17px]",
                          isActive(pathname, link.href) ? "text-brand-300" : "text-white/50",
                        )}
                        strokeWidth={1.9}
                      />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/10 px-1 pt-4">
        {externalLinks.map((link) => {
          const Icon = ICONS[link.icon];
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <Icon className="size-4" /> {link.label}
            </a>
          );
        })}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Globe className="size-4" /> Back to website
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-page">
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col overflow-y-auto border-r border-forest/40 bg-forest px-3 py-5 lg:flex">
          {sidebar}
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/40"
            />
            <div className="absolute inset-y-0 left-0 flex w-[272px] flex-col overflow-y-auto bg-forest px-3 py-5">
              {sidebar}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-white/92 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[12px] font-semibold text-ink-soft lg:hidden"
              >
                Menu
              </button>
              <div className="min-w-0 lg:hidden">
                <Logo />
              </div>
              <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
                <span className="truncate text-[14px] font-bold text-ink">{title}</span>
                <ChevronRight className="size-3.5 shrink-0 text-line-strong" />
                <span className="text-[12.5px] text-muted">{roleLabel}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href={notificationsHref}
                  className="hidden h-9 items-center rounded-full border border-line-strong px-3.5 text-[12px] font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700 sm:inline-flex"
                >
                  Notifications
                </Link>
                <Link
                  href={notificationsHref}
                  aria-label="Notifications"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:border-brand-300 hover:text-brand-700 sm:hidden"
                >
                  <ChevronRight className="size-4" />
                </Link>
                <Avatar className="size-9">
                  <AvatarFallback>{initials(displayName(user))}</AvatarFallback>
                </Avatar>
                <div className="hidden text-right sm:block">
                  <p className="text-[12.5px] font-semibold text-ink">{displayName(user)}</p>
                  <p className="text-[10.5px] text-muted">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 lg:hidden">
              {flatLinks.map((link) => {
                const active = isCurrent(pathname, link.href, flatLinks);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition",
                      active
                        ? "bg-brand-50 text-brand-800"
                        : "text-muted hover:bg-page hover:text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </header>

          <main
            id="main"
            className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Car,
  ChevronDown,
  Headset,
  MapPin,
  Menu,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { Logo } from "@/components/shared/logo";

type MegaColumn = {
  title: string;
  items: { label: string; href: string; icon: React.ElementType }[];
};

const megaMenus: Record<
  string,
  { href: string; columns: MegaColumn[]; note: string }
> = {
  "Bike Rentals": {
    href: "/bikes-scooters",
    note: "Free helmet with every two-wheeler rental",
    columns: [
      {
        title: "By type",
        items: [
          { label: "All bikes & scooters", href: "/bikes-scooters", icon: Bike },
          { label: "Scooters", href: "/bikes-scooters?type=scooter", icon: Zap },
          { label: "Motorcycles", href: "/bikes-scooters?type=motorcycle", icon: Bike },
        ],
      },
      {
        title: "Popular",
        items: [
          { label: "Honda Activa 6G", href: "/vehicles/honda-activa-6g", icon: Sparkles },
          { label: "Royal Enfield Classic 350", href: "/vehicles/royal-enfield-classic-350", icon: Sparkles },
          { label: "Electric scooters", href: "/bikes-scooters?fuel=Electric", icon: Zap },
        ],
      },
    ],
  },
  "Car Rentals": {
    href: "/cars",
    note: "Free doorstep delivery within Puducherry",
    columns: [
      {
        title: "By type",
        items: [
          { label: "All cars", href: "/cars", icon: Car },
          { label: "Hatchbacks", href: "/cars?body=hatchback", icon: Car },
          { label: "Sedans & SUVs", href: "/cars?body=suv", icon: Car },
        ],
      },
      {
        title: "Popular",
        items: [
          { label: "Hyundai i20", href: "/vehicles/hyundai-i20", icon: Sparkles },
          { label: "Honda City", href: "/vehicles/honda-city", icon: Sparkles },
          { label: "Tata Nexon", href: "/vehicles/tata-nexon", icon: Sparkles },
        ],
      },
    ],
  },
};

const primaryNav = [
  { label: "Bike Rentals", href: "/bikes-scooters" },
  { label: "Car Rentals", href: "/cars" },
  { label: "Tow Vehicle", href: "/tow-vehicle" },
  { label: "Acting Driver", href: "/driver-on-demand" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "List Your Vehicle", href: "/list-your-vehicle" },
  { label: "Support", href: "/faq" },
];

export function Header() {
  const pathname = usePathname();
  const { user, loading, isStaff, signOut } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useState("Puducherry");
  const firstName =
    user?.customerProfile?.fullName?.split(" ")[0] ??
    user?.email.split("@")[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-surface/90 backdrop-blur-xl transition-all duration-300",
        scrolled
          ? "border-line shadow-[0_8px_24px_-20px_rgba(13,31,20,0.35)]"
          : "border-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-4 xl:h-[72px]">
        <Logo />

        <nav className="ml-2 hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {primaryNav.map((item) => {
            const mega = megaMenus[item.label];
            if (!mega) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                    isActive(item.href)
                      ? "text-brand-700"
                      : "text-ink-soft hover:text-brand-700",
                  )}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.label} className="group relative">
                <Link
                  href={mega.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                    isActive(mega.href)
                      ? "text-brand-700"
                      : "text-ink-soft hover:text-brand-700",
                  )}
                >
                  {item.label}
                  <ChevronDown className="size-3.5 text-muted transition-transform duration-200 group-hover:rotate-180" />
                </Link>
                <div className="invisible absolute left-0 top-full w-[440px] translate-y-1 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {mega.columns.map((col) => (
                        <div key={col.title}>
                          <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                            {col.title}
                          </p>
                          {col.items.map((link) => (
                            <Link
                              key={link.label}
                              href={link.href}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
                            >
                              <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
                                <link.icon className="size-3.5" />
                              </span>
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-line bg-page/70 px-4 py-3">
                      <p className="text-[12px] text-muted">{mega.note}</p>
                      <Link
                        href={mega.href}
                        className="whitespace-nowrap text-[12px] font-semibold text-brand-700 hover:underline"
                      >
                        Browse all →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <span className="hidden h-9 w-24 animate-pulse rounded-full bg-page sm:block" />
          ) : user ? (
            <Link
              href={isStaff ? "/admin" : "/dashboard"}
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft transition hover:text-brand-700 sm:inline-flex"
            >
              <UserRound className="size-4" />
              {isStaff ? "Admin console" : firstName}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft transition hover:text-brand-700 sm:inline-flex"
            >
              <UserRound className="size-4" />
              Login
            </Link>
          )}
          {user ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard">My Account</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/register">Sign Up</Link>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition hover:bg-page xl:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[88%] max-w-sm">
          <DialogTitle className="sr-only">SavariGo menu</DialogTitle>
          <div className="border-b border-line px-5 py-4">
            <Logo />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              Explore
            </p>
            {[
              { label: "Home", href: "/" },
              { label: "Bike & Scooter Rentals", href: "/bikes-scooters" },
              { label: "Car Rental", href: "/cars" },
              { label: "Tow Vehicle", href: "/tow-vehicle" },
              { label: "Acting Driver", href: "/driver-on-demand" },
              { label: "Bike Taxi", href: "/bike-taxi" },
              { label: "Driver On-Demand", href: "/driver-on-demand" },
              { label: "How It Works", href: "/how-it-works" },
              { label: "Offers & Coupons", href: "/offers" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
              >
                {item.label}
                <ChevronDown className="size-4 -rotate-90 text-line-strong" />
              </Link>
            ))}
            <p className="px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              Account
            </p>
            {[
              { label: "My Dashboard", href: "/dashboard" },
              { label: "My Bookings", href: "/dashboard/bookings" },
              { label: "Saved Vehicles", href: "/dashboard/saved" },
              ...(isStaff ? [{ label: "Admin Console", href: "/admin" }] : []),
              { label: "List Your Vehicle", href: "/list-your-vehicle" },
              { label: "FAQ & Support", href: "/faq" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
              >
                {item.label}
                <ChevronDown className="size-4 -rotate-90 text-line-strong" />
              </Link>
            ))}
          </div>
          <div className="space-y-2 border-t border-line p-4">
            <div className="flex items-center gap-2 rounded-xl bg-page px-3 py-2.5 text-[12.5px] text-ink-soft">
              <MapPin className="size-4 text-brand-600" />
              Delivering to <span className="font-semibold text-ink">{location}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {user ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">My Account</Link>
                  </Button>
                  <Button type="button" onClick={() => void signOut()}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
            <a
              href="tel:+919876543210"
              className="flex items-center justify-center gap-2 pt-1 text-[12px] font-medium text-muted"
            >
              <Headset className="size-3.5" /> 24/7 support · +91 98765 43210
            </a>
          </div>
        </SheetContent>
      </Dialog>
    </header>
  );
}

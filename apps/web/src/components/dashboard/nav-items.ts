import {
  CalendarDays,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  ReceiptText,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const dashboardNav: { group: string; links: DashboardLink[] }[] = [
  {
    group: "Rides",
    links: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Bookings", href: "/dashboard/bookings", icon: CalendarDays },
      { label: "Saved Vehicles", href: "/dashboard/saved", icon: Heart },
      { label: "Payments", href: "/dashboard/payments", icon: ReceiptText },
    ],
  },
  {
    group: "Account",
    links: [
      { label: "Profile", href: "/dashboard/profile", icon: UserRound },
      { label: "Help & Support", href: "/contact", icon: LifeBuoy },
    ],
  },
];

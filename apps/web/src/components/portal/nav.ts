import type { PortalNavLink, PortalNavGroup } from "./shell";

// Icon names, never component references: these arrays cross the Server →
// Client Component boundary from the portal layouts, and only plain data can.

// ------------------------------------------------------------- master admin

export const ADMIN_NAV: PortalNavGroup[] = [
  {
    group: "Overview",
    links: [{ label: "Dashboard", href: "/admin", icon: "LayoutDashboard" }],
  },
  {
    group: "Manage",
    links: [
      { label: "User Management", href: "/admin/users", icon: "Users" },
      { label: "Rental Partners", href: "/admin/partners", icon: "CarFront" },
      { label: "Vehicle Management", href: "/admin/vehicles", icon: "ClipboardList" },
      { label: "Booking Management", href: "/admin/bookings", icon: "CalendarCheck" },
      { label: "Payments & Earnings", href: "/admin/payments", icon: "Coins" },
    ],
  },
  {
    group: "Platform",
    links: [
      { label: "City & Location", href: "/admin/locations", icon: "MapPinned" },
      { label: "Offers & Coupons", href: "/admin/coupons", icon: "Ticket" },
      { label: "Reviews & Ratings", href: "/admin/reviews", icon: "Star" },
      { label: "Document Verification", href: "/admin/documents", icon: "FileCheck2" },
      { label: "Support & Complaints", href: "/admin/support", icon: "Headset" },
    ],
  },
  {
    group: "Insights",
    links: [
      { label: "Notifications", href: "/admin/notifications", icon: "Bell" },
      { label: "Reports & Analytics", href: "/admin/reports", icon: "Gauge" },
      { label: "Settings", href: "/admin/settings", icon: "Settings" },
    ],
  },
];

export const ADMIN_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "User Management",
  "/admin/partners": "Rental Partners",
  "/admin/vehicles": "Vehicle Management",
  "/admin/vehicles/new": "Add Vehicle",
  "/admin/bookings": "Booking Management",
  "/admin/payments": "Payments & Earnings",
  "/admin/locations": "City & Location",
  "/admin/categories": "Vehicle Categories",
  "/admin/coupons": "Offers & Coupons",
  "/admin/reviews": "Reviews & Ratings",
  "/admin/documents": "Document Verification",
  "/admin/support": "Support & Complaints",
  "/admin/notifications": "Notifications",
  "/admin/reports": "Reports & Analytics",
  "/admin/settings": "Settings",
  "/admin/audit": "Audit Log",
};

export const ADMIN_SECONDARY_LINKS: PortalNavLink[] = [
  { label: "Categories", href: "/admin/categories", icon: "Tags" },
  { label: "Audit log", href: "/admin/audit", icon: "FileClock" },
];

export const ADMIN_EXTERNAL_LINKS: PortalNavLink[] = [
  { label: "API docs", href: "http://localhost:4100/docs", icon: "BookOpen", external: true },
];

// ------------------------------------------------------------- rental partner

export const PARTNER_NAV: PortalNavGroup[] = [
  {
    group: "Overview",
    links: [{ label: "Dashboard", href: "/partner", icon: "LayoutDashboard" }],
  },
  {
    group: "Fleet",
    links: [
      { label: "My Vehicles", href: "/partner/vehicles", icon: "CarFront" },
      { label: "Add New Vehicle", href: "/partner/vehicles/new", icon: "CalendarPlus" },
      { label: "Vehicle Availability", href: "/partner/availability", icon: "ClipboardList" },
    ],
  },
  {
    group: "Rentals",
    links: [
      { label: "Booking Requests", href: "/partner/bookings", icon: "Ticket" },
      { label: "Active Rentals", href: "/partner/active", icon: "CalendarCheck" },
      { label: "Rental History", href: "/partner/history", icon: "History" },
    ],
  },
  {
    group: "Money",
    links: [{ label: "Earnings & Payments", href: "/partner/earnings", icon: "Wallet" }],
  },
  {
    group: "Compliance",
    links: [
      { label: "My Documents", href: "/partner/documents", icon: "FileCheck2" },
      { label: "Reviews & Ratings", href: "/partner/reviews", icon: "Star" },
    ],
  },
  {
    group: "Account",
    links: [
      { label: "Notifications", href: "/partner/notifications", icon: "Bell" },
      { label: "Support", href: "/partner/support", icon: "LifeBuoy" },
      { label: "Profile & Settings", href: "/partner/profile", icon: "Settings" },
    ],
  },
];

export const PARTNER_TITLES: Record<string, string> = {
  "/partner": "Dashboard",
  "/partner/vehicles": "My Vehicles",
  "/partner/vehicles/new": "Add New Vehicle",
  "/partner/availability": "Vehicle Availability",
  "/partner/bookings": "Booking Requests",
  "/partner/active": "Active Rentals",
  "/partner/history": "Rental History",
  "/partner/earnings": "Earnings & Payments",
  "/partner/documents": "My Documents",
  "/partner/reviews": "Reviews & Ratings",
  "/partner/notifications": "Notifications",
  "/partner/support": "Support",
  "/partner/profile": "Profile & Settings",
};

export const PARTNER_SECONDARY_LINKS: PortalNavLink[] = [
  { label: "Master Admin portal", href: "/admin", icon: "UserCog" },
];

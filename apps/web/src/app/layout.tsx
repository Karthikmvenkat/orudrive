import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://savarigo.com"),
  title: {
    default: "SavariGo — Bikes, Scooters, Cars & Drivers in Puducherry",
    template: "%s | SavariGo",
  },
  description:
    "Rent bikes, scooters and cars or book a professional driver in Puducherry. Transparent pricing, verified vehicles and 24/7 support.",
  keywords: [
    "bike rental Puducherry",
    "scooter rental Puducherry",
    "car rental Puducherry",
    "bike taxi",
    "driver on demand",
  ],
  openGraph: {
    title: "SavariGo — Your city. Your ride. Your freedom.",
    description:
      "Puducherry's trusted rental platform for bikes, scooters, cars and professional drivers.",
    type: "website",
    locale: "en_IN",
    siteName: "SavariGo",
  },
};

export const viewport: Viewport = {
  themeColor: "#4caf2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-surface text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            className: "font-sans",
            style: {
              borderRadius: "12px",
              border: "1px solid #e5eae1",
            },
          }}
        />
      </body>
    </html>
  );
}

import { expect, test } from "./support/clean-console";

const ADMIN_SECTIONS = [
  { label: "User Management", path: "/admin/users", heading: /^user management$/i },
  { label: "Rental Partners", path: "/admin/partners", heading: /^rental partners$/i },
  { label: "Vehicle Management", path: "/admin/vehicles", heading: /^vehicles$/i },
  { label: "Booking Management", path: "/admin/bookings", heading: /^bookings$/i },
  { label: "Payments & Earnings", path: "/admin/payments", heading: /payments & earnings/i },
  { label: "City & Location", path: "/admin/locations", heading: /city & location/i },
  { label: "Offers & Coupons", path: "/admin/coupons", heading: /^coupons$/i },
  { label: "Reviews & Ratings", path: "/admin/reviews", heading: /^reviews$/i },
  { label: "Document Verification", path: "/admin/documents", heading: /document verification/i },
  { label: "Support & Complaints", path: "/admin/support", heading: /support & complaints/i },
  { label: "Notifications", path: "/admin/notifications", heading: /^notifications$/i },
  { label: "Reports & Analytics", path: "/admin/reports", heading: /revenue analytics/i },
  { label: "Settings", path: "/admin/settings", heading: /^settings$/i },
  // The two extras live under the sidebar's "More" group.
  { label: "Categories", path: "/admin/categories", heading: /^categories$/i },
  { label: "Audit log", path: "/admin/audit", heading: /audit log/i },
] as const;

test.describe("admin dashboard", () => {
  test("the control room renders the live counters and tables", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /control room/i })).toBeVisible();
    await expect(page.getByRole("main").locator("table").first()).toBeVisible();
  });

  test("every sidebar section links to a page that renders its own heading", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    for (const section of ADMIN_SECTIONS) {
      await expect(
        page.getByRole("link", { name: section.label, exact: true }).first(),
        `${section.label} link`,
      ).toBeVisible();
      await page.goto(section.path, { waitUntil: "domcontentloaded" });
      await expect(page, section.path).toHaveURL(section.path);
      await expect(
        page.getByRole("heading", { level: 1, name: section.heading }).first(),
        section.path,
      ).toBeVisible();
    }
  });

  test("pages reached through a filter rather than the sidebar still render", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    for (const [path, heading] of [
      ["/admin/users?tab=customers", /^user management$/i],
      ["/admin/users?tab=drivers", /^user management$/i],
    ] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page, path).toHaveURL(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }).first(),
        path,
      ).toBeVisible();
      await expect(page.locator("table").first(), `${path} table`).toBeVisible();
    }
  });

  test("the vehicles list filters by type and by live booking state", async ({ page }) => {
    await page.goto("/admin/vehicles", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { level: 1, name: /^vehicles$/i });
    await expect(heading).toBeVisible();

    // Rental partner is a column, not just a filter, because fleet is owned by partners.
    await expect(page.getByRole("columnheader", { name: "Rental partner" })).toBeVisible();

    const typeChip = page.getByRole("tab", { name: /all types/i });
    await expect(typeChip).toBeVisible();
    const scooterChip = page.getByRole("tab", { name: /scooters/i }).first();
    if (await scooterChip.isVisible()) {
      await scooterChip.click();
      await expect(page).toHaveURL(/category=scooter/);
      await expect(scooterChip).toHaveAttribute("aria-selected", "true");
    }

    await page.getByRole("tab", { name: /booked now/i }).click();
    await expect(page).toHaveURL(/view=BOOKED/);
    await expect(
      page.getByText(/vehicles match these filters/i),
    ).toBeVisible();
  });

  test("payments reports the split between the platform and its partners", async ({ page }) => {
    await page.goto("/admin/payments", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /payments & earnings/i }),
    ).toBeVisible();

    for (const label of [
      "Platform revenue",
      "Partner earnings",
      "Platform commission",
      "Pending settlements",
    ]) {
      await expect(page.getByText(label, { exact: true }).first(), label).toBeVisible();
    }

    await expect(
      page.getByRole("heading", { name: /payout position by partner/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /transaction history/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: "90 days" }).click();
    await expect(page).toHaveURL(/days=90/);
  });

  test("the bookings table filters down to one booking and resets", async ({ page }) => {
    await page.goto("/admin/bookings", { waitUntil: "domcontentloaded" });
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();

    // The leading cell holds the code and a timestamp; only the code is searchable.
    const [, code] =
      (await rows.first().locator("td").first().innerText()).match(/(SVR\d+)/) ?? [];
    if (!code) throw new Error("no booking code in the first row");
    await page.getByLabel("Search").fill(code);
    await page.getByRole("button", { name: "Filter" }).click();

    await expect(page).toHaveURL(/q=/);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(code);

    await page.getByRole("link", { name: "Reset" }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"));
    await expect(rows).toHaveCount(before);
  });

  test("a row action opens its form without leaving the page", async ({ page }) => {
    await page.goto("/admin/bookings", { waitUntil: "domcontentloaded" });
    const drawer = page.locator("details").filter({ has: page.getByLabel("Move to") }).first();
    // A closed <details> still shows its summary, so probe the control inside it.
    await expect(drawer.getByRole("button", { name: /save status/i })).toBeHidden();

    await drawer.locator("summary").click();
    await expect(drawer.getByRole("button", { name: /save status/i })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/admin/bookings");
  });

  test("the audit trail records who changed what", async ({ page }) => {
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    for (const column of ["When", "Actor", "Action", "Entity"]) {
      await expect(
        page.getByRole("columnheader", { name: column }).first(),
        column,
      ).toBeVisible();
    }
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("a phone gets a scrollable table instead of a broken page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/bookings", { waitUntil: "domcontentloaded" });

    const layout = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      const scroller = [...document.querySelectorAll("div")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && el.querySelector("table"))
        .map((el) => ({ tag: el.tagName, overflow: el.scrollWidth - el.clientWidth }));
      return { pageOverflow: root.scrollWidth - root.clientWidth, scrollers: scroller };
    });
    expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    expect(layout.scrollers.length).toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: /^bookings$/i })).toBeVisible();
  });

  test("operators can reach the live API documentation and get back out", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /api docs/i }).first()).toHaveAttribute(
      "href",
      /\/docs/,
    );

    await page.getByRole("button", { name: /^sign out$/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });
});

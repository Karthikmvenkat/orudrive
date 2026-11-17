import { expect, test } from "./support/clean-console";

/**
 * The Rental Partner portal is the second half of the same product: the sidebar
 * here is the spec's 13 items, and every screen reads through the vendor-scoped
 * endpoints, so this suite doubles as the "a partner only sees their own data"
 * check. The seeded partner is Pondy Rides (PR001, Puducherry, 20% commission).
 */
const PARTNER_SECTIONS = [
  // The dashboard heading is the partner's own trading name, not a fixed label.
  { label: "Dashboard", path: "/partner", heading: /pondy rides/i },
  { label: "My Vehicles", path: "/partner/vehicles", heading: /^my vehicles$/i },
  { label: "Add New Vehicle", path: "/partner/vehicles/new", heading: /^add new vehicle$/i },
  { label: "Vehicle Availability", path: "/partner/availability", heading: /vehicle availability/i },
  { label: "Booking Requests", path: "/partner/bookings", heading: /booking requests/i },
  { label: "Active Rentals", path: "/partner/active", heading: /active rentals/i },
  { label: "Rental History", path: "/partner/history", heading: /rental history/i },
  { label: "Earnings & Payments", path: "/partner/earnings", heading: /earnings & payments/i },
  { label: "My Documents", path: "/partner/documents", heading: /^my documents$/i },
  { label: "Reviews & Ratings", path: "/partner/reviews", heading: /reviews & ratings/i },
  { label: "Notifications", path: "/partner/notifications", heading: /^notifications$/i },
  { label: "Support", path: "/partner/support", heading: /^support$/i },
  { label: "Profile & Settings", path: "/partner/profile", heading: /profile & settings/i },
] as const;

test.describe("rental partner portal", () => {
  test("the dashboard reports this partner's own fleet and money", async ({ page }) => {
    await page.goto("/partner", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /pondy rides/i }),
    ).toBeVisible();
    await expect(page.getByText(/PR001 · Puducherry/)).toBeVisible();
    // The portal has to say what it scopes to, in the partner's own words.
    await expect(page.getByText(/you only see your own fleet/i)).toBeVisible();

    for (const label of [
      "My vehicles",
      "Booking requests",
      "Active rentals",
      "Net earnings",
      "Pending approvals",
    ]) {
      await expect(page.getByText(label, { exact: true }).first(), label).toBeVisible();
    }

    await expect(
      page.getByRole("heading", { name: /booking overview/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /revenue analytics/i }),
    ).toBeVisible();
  });

  test("every sidebar section links to a page that renders its own heading", async ({
    page,
  }) => {
    await page.goto("/partner", { waitUntil: "domcontentloaded" });

    for (const section of PARTNER_SECTIONS) {
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

  test("the fleet list filters by approval state and never shows another partner", async ({
    page,
  }) => {
    await page.goto("/partner/vehicles", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /^my vehicles$/i }),
    ).toBeVisible();

    // Approval is the partner's problem to watch, not to grant.
    const pending = page.getByRole("tab", { name: /pending approval/i });
    await expect(pending).toBeVisible();
    await pending.click();
    await expect(page).toHaveURL(/status=DRAFT/);
    await expect(pending).toHaveAttribute("aria-selected", "true");

    // "TVS Jupiter 125" belongs to Auroville Rentals. Searching for it here has
    // to come back empty because the API pins the query to this partner's fleet.
    await page.goto("/partner/vehicles?q=TVS%20Jupiter%20125", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/no vehicle matches these filters/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /TVS Jupiter/i })).toHaveCount(0);

    // Role-based access is enforced before the page renders, not by hiding links.
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/partner/);
    await expect(page.getByText(/rental partners/i)).toHaveCount(0);
  });

  test("the add-vehicle wizard holds each step's required fields", async ({ page }) => {
    await page.goto("/partner/vehicles/new", { waitUntil: "domcontentloaded" });

    // The step counter appears twice by design (header strip and footer row).
    const stepText = (index: number) => page.getByText(`Step ${index} of 5`).first();
    await expect(stepText(1)).toBeVisible();
    await expect(page.getByText("20% complete")).toBeVisible();
    for (const title of [
      "Basic Information",
      "Specifications",
      "Photos & Documents",
      "Pricing",
      "Availability",
    ]) {
      await expect(
        page.getByRole("button", { name: new RegExp(title, "i") }),
        title,
      ).toBeVisible();
    }

    const next = page.getByRole("button", { name: /next step/i });

    // Empty step: neither the linear nor the forward-jump path may advance.
    await next.click();
    await expect(page.getByText(/still needed:/i)).toBeVisible();
    await expect(stepText(1)).toBeVisible();
    await page.getByRole("button", { name: /pricing/i }).click();
    await expect(stepText(1)).toBeVisible();

    await page.getByLabel(/listing name/i).fill("Playwright Test Rider");
    await page.getByLabel(/^brand$/i).fill("Honda");
    const category = page.getByLabel(/category/i);
    await category.selectOption(
      await category.locator("option:not([disabled])").first().getAttribute("value"),
    );
    await page.getByLabel(/registration number/i).fill("PY99PW0001");
    await expect(page.getByText(/still needed:/i)).toBeHidden();

    await next.click();
    await expect(stepText(2)).toBeVisible();
    await expect(page.getByText("40% complete")).toBeVisible();

    await page.getByLabel(/engine or motor/i).fill("109.5 cc");
    await page.getByLabel(/mileage/i).fill("48 km/l");
    await page.getByLabel(/description/i).fill("Reserved by the partner portal test suite.");

    await next.click();
    await expect(stepText(3)).toBeVisible();
    // Paperwork is a separate verified record, so the wizard has to say so.
    await expect(
      page.getByText(/rc book and insurance are filed separately/i),
    ).toBeVisible();

    await next.click();
    await expect(stepText(4)).toBeVisible();
    await page.getByLabel(/day rate/i).fill("999");
    await page.getByLabel(/extra km charge/i).fill("7");

    await next.click();
    await expect(stepText(5)).toBeVisible();
    await expect(page.getByText("100% complete")).toBeVisible();

    // The final step is the one the spec asks for: submission, not activation.
    await expect(
      page.getByRole("button", { name: /submit for master admin approval/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/this listing is submitted as pending approval/i),
    ).toBeVisible();

    const hub = page.getByLabel(/pickup hub/i);
    await hub.selectOption(
      await hub.locator("option:not([disabled])").first().getAttribute("value"),
    );
    await expect(page.getByLabel(/hub operating hours/i)).not.toHaveValue(
      "Pick a hub to see its hours",
    );
  });

  test("rental history narrows by status tab and by pickup dates", async ({ page }) => {
    await page.goto("/partner/history", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /rental history/i }),
    ).toBeVisible();

    const completed = page.getByRole("tab", { name: /completed/i });
    await completed.click();
    await expect(page).toHaveURL(/status=COMPLETED/);
    await expect(completed).toHaveAttribute("aria-selected", "true");

    await page.getByLabel(/pickup from/i).fill("2026-01-01");
    await page.getByLabel(/pickup to/i).fill("2026-03-31");
    await page.getByRole("button", { name: /filter/i }).click();
    await expect(page).toHaveURL(/from=2026-01-01/);
    await expect(page).toHaveURL(/to=2026-03-31/);
    await expect(
      page.getByRole("heading", { name: /booking/i }).first(),
    ).toBeVisible();
  });

  test("earnings split the platform's commission from the partner's share", async ({
    page,
  }) => {
    await page.goto("/partner/earnings", { waitUntil: "domcontentloaded" });

    for (const label of [
      "Collected on your fleet",
      "Platform commission",
      "Net payable to you",
      "Pending settlement",
      "Refunded to riders",
    ]) {
      await expect(page.getByText(label, { exact: true }).first(), label).toBeVisible();
    }

    await expect(
      page.getByRole("heading", { name: /earnings overview/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /settlement position/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /transaction history/i }),
    ).toBeVisible();
    // The rate is Master Admin's to set, so the page has to name where it came from.
    await expect(page.getByText(/20% set by master admin/i)).toBeVisible();
  });

  test("the availability calendar switches between daily and monthly", async ({ page }) => {
    await page.goto("/partner/availability", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /next 21 days/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /whole fleet/i })).toBeVisible();

    await page.getByRole("link", { name: /monthly view/i }).click();
    await expect(page).toHaveURL(/mode=month/);
    await expect(
      page.getByRole("heading", { name: /next 21 days/i }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: /daily view/i }).click();
    await expect(page).toHaveURL(/mode=day/);
    await expect(page.getByRole("heading", { name: /next 21 days/i })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /periods in this window/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /block dates/i }),
    ).toBeVisible();
  });

  test("requests and rentals carry the partner's own decisions", async ({ page }) => {
    await page.goto("/partner/bookings", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Waiting on you", { exact: true })).toBeVisible();
    const requests = page.locator("tbody tr");
    if ((await requests.count()) > 0) {
      await expect(
        requests.first().getByRole("button", { name: /^accept$/i }),
      ).toBeVisible();
      await expect(
        requests.first().locator("summary").filter({ hasText: /decline/i }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/nothing to action right now/i),
      ).toBeVisible();
    }

    await page.goto("/partner/active", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Active rentals", { exact: true }).first()).toBeVisible();
    const rentals = page.locator("tbody tr");
    if ((await rentals.count()) > 0) {
      await expect(rentals.first()).toBeVisible();
    } else {
      await expect(
        page.getByText(/no rental is running right now/i),
      ).toBeVisible();
    }
  });

  test("documents and profile state who is allowed to approve", async ({ page }) => {
    await page.goto("/partner/documents", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /^my documents$/i }),
    ).toBeVisible();
    for (const label of ["Documents on file", "Awaiting review", "Approved", "Needs attention"]) {
      await expect(page.getByText(label, { exact: true }).first(), label).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: /submit a document/i }),
    ).toBeVisible();

    await page.goto("/partner/profile", { waitUntil: "domcontentloaded" });
    for (const label of ["Partner code", "Approval status", "Platform commission", "Fleet size"]) {
      await expect(page.getByText(label, { exact: true }).first(), label).toBeVisible();
    }
    await expect(page.getByLabel(/trading name/i)).not.toHaveValue("");
  });

  test("a phone gets a scrollable fleet table instead of a broken page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/partner/vehicles", { waitUntil: "domcontentloaded" });

    const layout = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      const scrollers = [...document.querySelectorAll("div")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && el.querySelector("table"))
        .map((el) => el.scrollWidth - el.clientWidth);
      return { pageOverflow: root.scrollWidth - root.clientWidth, scrollers };
    });
    expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    expect(layout.scrollers.length).toBeGreaterThan(0);

    await expect(
      page.getByRole("heading", { level: 1, name: /^my vehicles$/i }),
    ).toBeVisible();
  });
});

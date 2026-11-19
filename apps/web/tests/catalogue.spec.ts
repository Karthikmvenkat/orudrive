import { expect, test, type Page } from "@playwright/test";
import { CUSTOMER_EMAIL, submitCredentials } from "./support/session";
import { waitForHydration } from "./support/hydration";

/**
 * One link per fleet card. The card's photo link wraps an absolutely positioned
 * image and therefore has an empty box, so the heading link is the one that is
 * actually actionable.
 */
const vehicleLinks = (page: Page) => page.locator('main h3 a[href^="/vehicles/"]');

test.describe("catalogue and search", () => {
  test("the home search hands its dates to the car listing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const from = page.getByLabel("Pick-up date");
    const to = page.getByLabel("Return date");
    // The panel renders empty and its mount effect fills in tomorrow's dates,
    // so a populated field proves React owns the value being typed.
    await expect(from).not.toHaveValue("");

    await from.fill("2026-12-10");
    await to.fill("2026-12-14");
    await page.getByLabel("Vehicle type").selectOption("car");
    await page.getByRole("button", { name: "Search Rides" }).click();

    await expect(page).toHaveURL(/\/cars\?/);
    await expect(page).toHaveURL(/from=2026-12-10/);
    await expect(page).toHaveURL(/to=2026-12-14/);
    await expect(vehicleLinks(page).first()).toBeVisible();
  });

  test("the listing shows seeded fleet and narrows with the search box", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    const total = await vehicleLinks(page).count();
    expect(total).toBeGreaterThan(0);

    await page.getByLabel("Search vehicles").fill("i20");
    await expect(page.getByText(/Showing \d+ of \d+ vehicles/)).toBeVisible({
      timeout: 15_000,
    });
    const narrowed = await vehicleLinks(page).count();
    expect(narrowed).toBeLessThan(total);
    expect(narrowed).toBeGreaterThan(0);

    await page.getByLabel("Search vehicles").fill("no-such-vehicle-xyz");
    await expect(page.getByRole("heading", { name: "No vehicles found" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(vehicleLinks(page).first()).toBeVisible();
  });

  test("the filter sheet applies and reports a count", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    const summary = page.getByText(/Showing \d+ of \d+ vehicles/);
    await expect(summary).toBeVisible();
    const matching = async () =>
      Number((await summary.innerText()).match(/of (\d+) vehicles/)?.[1]);
    const unfiltered = await matching();

    // At this width the panel lives in the sidebar and applies as you click;
    // its options are built from the loaded fleet, so each one matches a car.
    const aside = page.locator("aside");
    await aside.getByRole("checkbox").first().check();
    await expect(aside.locator("p").filter({ hasText: "Filters" }).first()).toHaveText(
      /Filters\s*1/,
    );
    const filtered = await matching();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThanOrEqual(unfiltered);

    await aside.getByRole("button", { name: "Clear all" }).click();
    await expect(async () => {
      expect(await matching()).toBe(unfiltered);
    }).toPass();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Filters" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel("Maximum price per day")).toBeVisible();
    const apply = sheet.getByRole("button", { name: /show \d+ vehicles/i });
    await expect(apply).toHaveText(`Show ${unfiltered} vehicles`);
    await apply.click();
    await expect(sheet).toBeHidden();
    await expect(summary).toBeVisible();
  });

  test("a vehicle page exposes specifications, plans and reviews", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    await vehicleLinks(page).first().click();
    await expect(page).toHaveURL(/\/vehicles\/[\w-]+$/);

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await waitForHydration(page, 'input[aria-label="Pick-up date"]');
    for (const tab of ["Overview", "Specifications", "Rental Plans"]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
    await expect(
      page.getByRole("tab", { name: /Reviews( \(\d+\))?/ }),
    ).toBeVisible();
  });

  test("booking a vehicle from its page asks for a login first", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    await vehicleLinks(page).first().click();

    // A vehicle page renders the booking widget twice, inline for phones and in
    // the sidebar for desktop; only the sidebar copy is on screen here.
    const widget = page.locator("aside");
    await expect(widget.getByLabel("Pick-up date")).toBeVisible();
    await expect(widget.getByLabel("Pick-up location")).toBeVisible();
    await waitForHydration(page, 'aside input[aria-label="Pick-up date"]');
    await widget.getByRole("button", { name: /book this vehicle/i }).click();

    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout|\/checkout/);
    if (page.url().includes("/login")) {
      await submitCredentials(page, CUSTOMER_EMAIL);
      await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });
      await expect(
        page.getByRole("heading", { name: "Confirm Your Booking" }),
      ).toBeVisible();
    }
  });

  test("the bikes route honours a type query", async ({ page }) => {
    await page.goto("/bikes-scooters?type=scooter", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Showing \d+–\d+ of \d+ vehicles/)).toBeVisible();
    await expect(vehicleLinks(page).first()).toBeVisible();
  });
});

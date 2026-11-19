import { expect, test } from "./support/clean-console";
import { waitForHydration } from "./support/hydration";

/** Dates relative to today: the panel refuses a window that has already passed. */
const isoDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

const VIEWPORTS = [
  { name: "small phone", width: 360, height: 640 },
  { name: "large phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES = [
  "/",
  "/cars",
  "/bikes-scooters",
  "/how-it-works",
  "/offers",
  "/tow-vehicle",
  "/faq",
  "/contact",
  "/list-your-vehicle",
  "/login",
  "/register",
];

test.describe("responsive layout", () => {
  for (const viewport of VIEWPORTS) {
    test(`no page scrolls sideways on a ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const path of PAGES) {
        await page.goto(path, { waitUntil: "load" });
        const overflow = await page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          return root.scrollWidth - root.clientWidth;
        });
        expect(overflow, `${path} on ${viewport.name}`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("a phone gets only the profile control in the header", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const header = page.getByRole("banner");
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("a desktop gets only the profile control in the header", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
    for (const label of ["Car Rentals", "Tow Vehicle", "Support"]) {
      await expect(header.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("search stays usable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // The panel is state-owned: hydration lands before its mount effect has
    // prefilled the window, and typing into that gap gets overwritten.
    await waitForHydration(page, 'input[aria-label="Pick-up date"]');
    await expect(page.getByLabel("Pick-up date")).not.toHaveValue("");
    await page.getByLabel("Pick-up date").fill(isoDay(20));
    await page.getByLabel("Return date").fill(isoDay(24));
    await expect(page.getByLabel("Pick-up date")).toHaveValue(isoDay(20));
    // "all" would route to /bikes-scooters; a car search is the /cars journey.
    await page.getByLabel("Vehicle type").selectOption("car");
    await page.getByRole("button", { name: "Search Rides" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/cars\\?city=.+&from=${isoDay(20)}&to=${isoDay(24)}`),
    );
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

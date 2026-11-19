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

  test("a desktop gets the full navigation and the profile control", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const header = page.getByRole("banner");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    for (const label of ["For Riders", "For Drivers", "For Businesses"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(header.getByRole("link", { name: "Support" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("booking bar searches from a phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // The bar is state-owned: hydration lands before its mount effect sets
    // the minimum date.
    await waitForHydration(page, 'input[aria-label="Select date"]');
    await page.getByLabel("Pickup location").fill("Auroville");
    await page.getByLabel("Select date").fill(isoDay(20));
    await page.getByLabel("Select time").fill("10:30");
    await page.getByRole("button", { name: "Find Service" }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/vehicles\\?city=Auroville&from=${isoDay(20)}&to=${isoDay(21)}&time=10%3A30`,
      ),
    );
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

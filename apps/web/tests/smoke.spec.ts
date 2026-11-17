import { expect, test } from "@playwright/test";
import { expectHealthyPage, watchConsole } from "./support/session";

const marketingPages = [
  { path: "/how-it-works", title: /^How It Works/, section: /choose your ride/i },
  { path: "/offers", title: /^Offers & Coupons/, section: /fine print/i },
  { path: "/faq", title: /^FAQ & Support/, section: /still stuck/i },
  { path: "/about", title: /^About Us/, section: /four promises/i },
  { path: "/contact", title: /^Contact Us/, section: /send us a message/i },
  { path: "/terms", title: /^Terms & Conditions/, section: /cancellation and refunds/i },
  { path: "/privacy", title: /^Privacy Policy/, section: /what we collect/i },
  { path: "/list-your-vehicle", title: /^List Your Vehicle/, section: /monthly earnings/i },
  { path: "/tow-vehicle", title: /^Tow Vehicle Support/, section: /towing rates/i },
  { path: "/bike-taxi", title: /^Bike Taxi/, section: /fares you can count on/i },
  { path: "/driver-on-demand", title: /^Driver On-Demand/, section: /from request to ride/i },
];

test.describe("public website", () => {
  test("home page renders the hero and the search widget", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /your ride/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Pick-up city")).toBeVisible();
    await expect(page.getByLabel("Pick-up date")).toBeVisible();
    await expect(page.getByLabel("Return date")).toBeVisible();
    await expect(page.getByRole("button", { name: "Search Rides" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Car Rentals" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bike Rentals" })).toBeVisible();
  });

  test("every marketing page renders its title, hero and sections", async ({ page }) => {
    for (const entry of marketingPages) {
      await page.goto(entry.path, { waitUntil: "domcontentloaded" });
      await expect(page, entry.path).toHaveTitle(entry.title);
      await expectHealthyPage(page);
      await expect(page.getByRole("heading", { level: 1 }).first(), entry.path)
        .not.toHaveText("");
      await expect(
        page.getByRole("heading", { level: 2, name: entry.section }).first(),
        `${entry.path} > ${entry.section}`,
      ).toBeVisible();
    }
  });

  test("footer navigation reaches the real destinations", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "About Us" })).toHaveAttribute(
      "href",
      "/about",
    );
    await expect(footer.getByRole("link", { name: "FAQ" })).toHaveAttribute(
      "href",
      "/faq",
    );
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );

    await footer.getByRole("link", { name: "Contact Us" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("the skip link moves focus past the navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const skip = page.getByRole("link", { name: /skip to content/i });
    await expect(skip).toHaveAttribute("href", "#main");

    // `sr-only` keeps a 1px box, so visibility alone proves nothing; the
    // point is that it stays collapsed until the keyboard reaches it.
    expect((await skip.boundingBox())?.width).toBeLessThanOrEqual(2);

    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    expect((await skip.boundingBox())?.width).toBeGreaterThan(40);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main/);
    await expect(page.locator("main")).toBeInViewport();
  });

  test("unknown routes render the branded 404", async ({ page }) => {
    await page.goto("/definitely-not-a-page", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /doesn.t exist/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
  });

  test("core pages load without browser errors or failed requests", async ({ page }) => {
    const errors = watchConsole(page);
    const failed: string[] = [];
    page.on("requestfailed", (request) => {
      // Navigating away cancels the session lookup that is still in flight;
      // that is normal browser behaviour, not a broken request.
      const reason = request.failure()?.errorText ?? "";
      if (reason.includes("ERR_ABORTED")) return;
      failed.push(`FAILED ${request.method()} ${request.url()} ${reason}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failed.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    for (const path of ["/", "/cars", "/bikes-scooters", "/vehicles", "/login"]) {
      await page.goto(path, { waitUntil: "load" });
      await expectHealthyPage(page);
    }

    expect(errors, errors.join("\n")).toEqual([]);
    expect(failed, failed.join("\n")).toEqual([]);
  });

  test("fleet imagery carries alternative text", async ({ page }) => {
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    const images = page.locator("main img");
    expect(await images.count()).toBeGreaterThan(0);
    for (let index = 0; index < Math.min(await images.count(), 8); index += 1) {
      const alt = await images.nth(index).getAttribute("alt");
      expect(alt, `image ${index} has no alt text`).not.toBeNull();
      expect(alt?.trim().length).toBeGreaterThan(2);
    }
  });
});

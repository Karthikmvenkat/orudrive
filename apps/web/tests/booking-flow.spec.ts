import { expect, test, type Page } from "@playwright/test";
import { waitForHydration } from "./support/hydration";

/**
 * A run-specific window far outside the seeded demo data and outside the ranges
 * the booking-scenario suites occupy. Each run gets its own window, so a booking
 * left behind by an interrupted run cannot lock the next one out.
 */
const START_DAY = 400 + (Date.now() % 120);

const isoDay = (offsetDays: number) =>
  new Date(Date.now() + (START_DAY + offsetDays) * 86_400_000).toISOString().slice(0, 10);

/**
 * Types the rental window and proves the form saw it: the summary card renders
 * watched state, so matching text is evidence that React — not just the DOM —
 * holds these dates.
 */
async function fillDates(page: Page, from: number, to: number) {
  await page.getByLabel("Pick-up date").fill(isoDay(from));
  await page.getByLabel("Return date").fill(isoDay(to));
  await expect(page.getByText(new RegExp(`${isoDay(from)}\\D+${isoDay(to)}`))).toBeVisible({
    timeout: 30_000,
  });
}

async function openCheckout(page: Page) {
  await page.goto("/cars", { waitUntil: "domcontentloaded" });
  const card = page.locator('main h3 a[href^="/vehicles/"]').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/vehicles\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Phones get an inline widget, desktop the sidebar copy; only the latter is
  // on screen at this viewport.
  await waitForHydration(page, 'aside input[aria-label="Pick-up date"]');
  await page.locator("aside").getByRole("button", { name: "Book This Vehicle" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(
    page.getByRole("heading", { name: "Confirm Your Booking" }),
  ).toBeVisible();
  // The form is react-hook-form owned and this route is compiled on first hit.
  await waitForHydration(page, "#pickupDate");
}

/** Walks the real checkout and returns the booking code. */
async function reserveVehicle(page: Page, from: number, to: number) {
  await openCheckout(page);
  await fillDates(page, from, to);
  await page.getByRole("radio", { name: /pay at pick-up/i }).click();
  await page.getByRole("checkbox", { name: /agree to the rental terms/i }).check();
  await page.getByRole("button", { name: /reserve now/i }).click();

  await expect(page).toHaveURL(/\/booking\/SVR\d{6}\/confirmed/, { timeout: 30_000 });
  return page.url().match(/SVR\d{6}/)?.[0] ?? "";
}

test.describe("booking journey", () => {
  test("a signed-in rider reserves a vehicle and finds it on the dashboard", async ({
    page,
  }) => {
    const code = await reserveVehicle(page, 0, 3);
    expect(code).toMatch(/^SVR\d{6}$/);

    await expect(
      page.getByRole("heading", { name: /your ride is reserved/i }),
    ).toBeVisible();
    await expect(page.getByText(`Booking #${code}`)).toBeVisible();
    await expect(page.getByRole("link", { name: /view booking details/i })).toBeVisible();

    await page.goto("/dashboard/bookings", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article").filter({ hasText: code })).toBeVisible();
  });

  test("a reservation can be cancelled from the dashboard", async ({ page }) => {
    const code = await reserveVehicle(page, 10, 13);

    await page.goto("/dashboard/bookings", { waitUntil: "domcontentloaded" });
    const row = page.locator("article").filter({ hasText: code });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /^cancel$/i }).click();

    await expect(
      page.getByRole("heading", { name: new RegExp(`cancel booking ${code}`, "i") }),
    ).toBeVisible();
    await page.getByRole("button", { name: /yes, cancel/i }).click();

    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: new RegExp(code) }).first(),
    ).toBeVisible();
    await expect(
      page.locator("article").filter({ hasText: code }).getByText("Cancelled", { exact: false }),
    ).toBeVisible();
  });

  test("an online payment falls back to a reservation when the gateway is off", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "note",
      description:
        "The test API runs without Razorpay keys, so the online path must degrade to " +
        "a reserved booking instead of failing the checkout.",
    });

    await openCheckout(page);
    await fillDates(page, 100, 102);
    // "UPI" alone also matches the "Pay at pick-up — Cash or UPI" hint.
    await page.getByRole("radio", { name: /upi \/ google pay/i }).click();
    await page.getByRole("checkbox", { name: /agree to the rental terms/i }).check();
    await page.getByRole("button", { name: /pay .+ & book now/i }).click();

    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /payments aren.t configured/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/booking\/SVR\d{6}\/confirmed/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /your ride is reserved/i }),
    ).toBeVisible();
  });

  test("an inverted rental window is refused before anything is booked", async ({ page }) => {
    await openCheckout(page);
    // Deliberately out of range: the return input carries a `min` of the pick-up
    // date, so the browser blocks the submit and react-hook-form never runs — the
    // summary still shows the pair, which proves the refusal is the form's doing.
    await fillDates(page, 22, 21);
    await page.getByRole("checkbox", { name: /agree to the rental terms/i }).check();

    expect(
      await page
        .locator("#returnDate")
        .evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow),
      "the return date should fail the form's own minimum-date constraint",
    ).toBe(true);

    await page.getByRole("button", { name: /reserve now|pay .+ & book now/i }).click();

    expect(new URL(page.url()).pathname).toBe("/checkout");
    await expect(page.getByRole("heading", { name: /your ride is reserved/i })).toBeHidden();
  });

  test("a booked-out window is refused for the same vehicle", async ({ page }) => {
    const code = await reserveVehicle(page, 200, 202);
    expect(code).toMatch(/^SVR\d{6}$/);

    await openCheckout(page);
    await fillDates(page, 200, 202);
    await page.getByRole("radio", { name: /pay at pick-up/i }).click();
    await page.getByRole("checkbox", { name: /agree to the rental terms/i }).check();
    await page.getByRole("button", { name: /reserve now/i }).click();

    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: /no longer available|already booked|conflict/i })
        .first(),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/checkout");
  });
});

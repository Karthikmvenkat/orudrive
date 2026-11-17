import { expect, test } from "./support/clean-console";

test.describe("customer dashboard", () => {
  test("the overview greets the rider and summarises their rides", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: /good (morning|afternoon|evening)/i }),
    ).toBeVisible();
    for (const stat of ["Upcoming rides", "Completed rides", "Total spent"]) {
      await expect(page.getByText(stat, { exact: false }).first(), stat).toBeVisible();
    }
    await expect(page.getByText("Your next ride", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a ride/i })).toBeVisible();
  });

  test("the sidebar reaches every section of the account", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    for (const [label, path] of [
      ["My Bookings", "/dashboard/bookings"],
      ["Saved Vehicles", "/dashboard/saved"],
      ["Payments", "/dashboard/payments"],
      ["Profile", "/dashboard/profile"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.getByRole("main")).toBeVisible();
    }
  });

  test("the booking list filters by tab and opens a real booking", async ({ page }) => {
    await page.goto("/dashboard/bookings", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();

    const rows = page.locator("article");
    await expect(rows.first()).toBeVisible();

    await page.getByRole("tab", { name: /upcoming/i }).click();
    await expect(page.getByRole("tab", { name: /upcoming/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Each trigger's accessible name also carries its booking count.
    await page.getByRole("tab", { name: /^all\b/i }).click();
    await rows.first().getByRole("link", { name: "Details" }).click();
    await expect(page).toHaveURL(/\/dashboard\/bookings\/[\w-]+$/);
    for (const panel of ["Ride status", "Trip details", "Payment summary"]) {
      await expect(page.getByRole("heading", { name: panel }).first(), panel).toBeVisible();
    }
  });

  test("payments lists captured money with an invoice action", async ({ page }) => {
    await page.goto("/dashboard/payments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Payments & Invoices" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /transaction history/i })).toBeVisible();
    for (const column of ["Date", "Vehicle", "Amount", "Status"]) {
      await expect(page.getByRole("columnheader", { name: column }).first(), column).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "PDF" }).first()).toBeVisible();
  });

  test("the profile shows the rider's contact details and locks the email", async ({
    page,
  }) => {
    await page.goto("/dashboard/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Profile & Settings" })).toBeVisible();

    await expect(page.getByLabel("Full name")).not.toHaveValue("");
    await expect(page.getByLabel("Email address")).toBeDisabled();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });

  test("saved vehicles and empty states render", async ({ page }) => {
    await page.goto("/dashboard/saved", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Saved Vehicles" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /explore more rides/i }),
    ).toBeVisible();
  });

  test("the account fits a phone and keeps its navigation reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Open menu" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("link", { name: "Payments" }).first()).toBeVisible();
    await sheet.getByRole("link", { name: "Payments" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/payments$/);
  });
});

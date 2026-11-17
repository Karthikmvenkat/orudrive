import { expect, test } from "@playwright/test";
import {
  CUSTOMER_EMAIL,
  E2E_PASSWORD,
  signIn,
  submitCredentials,
  watchConsole,
} from "./support/session";

const toast = (page: import("@playwright/test").Page, text: RegExp) =>
  page.locator("[data-sonner-toast]").filter({ hasText: text }).first();

test.describe("authentication", () => {
  test("protected routes send anonymous visitors to the login page", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();
  });

  test("a wrong password is rejected without leaking which field failed", async ({ page }) => {
    await page.goto("/login", { waitUntil: "load" });
    await submitCredentials(page, CUSTOMER_EMAIL, "wrong-password-here");

    await expect(toast(page, /invalid|incorrect|unable to sign in/i)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("a customer signs in, sees the dashboard and signs out again", async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /good (morning|afternoon|evening)/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("a staff account lands in the admin console", async ({ page }) => {
    await signIn(page, process.env.E2E_ADMIN_EMAIL ?? "admin@savarigo.com");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: /control room/i }),
    ).toBeVisible();
  });

  test("a new rider registers and verifies the e-mail code", async ({ page }) => {
    const errors = watchConsole(page);
    const email = `e2e-${Date.now()}@scenario.savarigo.test`;

    await page.goto("/register", { waitUntil: "load" });
    await page.getByLabel("Full name").fill("E2E Rider");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Phone number").fill(`9${Date.now().toString().slice(-9)}`);
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByRole("heading", { name: /verify your email/i }),
    ).toBeVisible();
    const code = await page
      .getByText(/development code:\s*(\d{6})/i)
      .innerText()
      .then((text) => text.match(/\d{6}/)?.[0]);
    expect(code, "AUTH_DEBUG_OTP must be true for the test API").toMatch(/^\d{6}$/);

    await page.getByLabel(/verification code/i).fill(code!);
    await page.getByRole("button", { name: /verify & continue/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

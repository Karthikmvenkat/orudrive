import { expect, type Page } from "@playwright/test";
import { waitForHydration } from "./hydration";

export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "SavariGo@2026";
export const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? "karthik@email.com";
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@savarigo.com";
export const VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL ?? "vendor@savarigo.com";

/** The login form is react-hook-form owned, so it has to be hydrated first. */
export async function waitForLoginForm(page: Page) {
  await waitForHydration(page, "#password");
}

/**
 * Types the demo credentials and submits the form.
 *
 * The hydration gate comes first on purpose: react-hook-form owns these fields,
 * so filling before it mounts leaves the typed values out of its state and the
 * submit silently does nothing.
 */
export async function submitCredentials(
  page: Page,
  email: string,
  password = E2E_PASSWORD,
) {
  await waitForLoginForm(page);
  const emailField = page.getByLabel("Email or phone number");
  // `exact` because the reveal button is labelled "Show password".
  const passwordField = page.getByLabel("Password", { exact: true });
  await emailField.fill(email);
  await passwordField.fill(password);
  await expect(emailField).toHaveValue(email);
  await expect(passwordField).toHaveValue(password);
  await page.getByRole("button", { name: "Login" }).click();
}

/** Signs in through the real login form; the session lives in httpOnly cookies. */
export async function signIn(
  page: Page,
  email: string,
  landing: string | RegExp = /\/(dashboard|admin|partner)/,
) {
  await page.goto("/login", { waitUntil: "load" });
  await submitCredentials(page, email);
  await page.waitForURL(landing, { timeout: 45_000 });
}

/** Collects browser-side errors from this point on; call before navigating. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function expectHealthyPage(page: Page) {
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Something went wrong");
}

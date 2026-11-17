import { chromium, type FullConfig } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_EMAIL, CUSTOMER_EMAIL, signIn, VENDOR_EMAIL } from "./support/session";
import { browserChannel } from "./support/browser";

const authDir = join(process.cwd(), "tests", ".auth");

export const customerState = join(authDir, "customer.json");
export const adminState = join(authDir, "admin.json");
export const vendorState = join(authDir, "vendor.json");

const emptyState = JSON.stringify({ cookies: [], origins: [] }, null, 2);

/**
 * Signs in once per identity through the real login form and keeps the
 * resulting httpOnly cookies, so the suites start from a genuine session
 * instead of replaying the form in every test.
 *
 * A failed sign-in is recorded as an empty state rather than thrown, so the
 * public suites still run against an API that has no seeded admin; the
 * authenticated suites then fail on the missing content they were asked to
 * check, with the warning above as the explanation.
 */
export default async function globalSetup(config: FullConfig) {
  mkdirSync(authDir, { recursive: true });
  const baseURL = config.projects[0].use.baseURL;

  let browser;
  try {
    browser = await chromium.launch({ channel: browserChannel });
    for (const [email, file] of [
      [CUSTOMER_EMAIL, customerState],
      [ADMIN_EMAIL, adminState],
      [VENDOR_EMAIL, vendorState],
    ] as const) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        await signIn(page, email);
        await context.storageState({ path: file });
      } catch (error) {
        writeFileSync(file, emptyState);
        console.warn(
          `[e2e] could not sign in as ${email}: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            `Is the API on ${process.env.E2E_API_URL ?? "http://localhost:4100"} and ` +
            `the site on ${baseURL} talking to a seeded database?`,
        );
      }
      await context.close();
    }
  } finally {
    await browser?.close();
    for (const file of [customerState, adminState, vendorState]) {
      if (!existsSync(file)) writeFileSync(file, emptyState);
    }
  }
}

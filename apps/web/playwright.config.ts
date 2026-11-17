import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { browserChannel } from "./tests/support/browser";

const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:3001";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4100";
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://savarigo:savarigo@127.0.0.1:5432/savari_test?schema=public";
const authDir = join(process.cwd(), "tests", ".auth");

/**
 * The suite talks to the real NestJS API and a real PostgreSQL database, so it
 * runs serially: the throttler budgets and the seeded fleet are shared state.
 * Everything is written to `savari_test`, never to the development database.
 *
 * Playwright boots `webServer` before `globalSetup`, and `reuseExistingServer`
 * lets an already-running API/site be picked up, so `npm run test:e2e` works
 * both against the dev servers and from a cold checkout.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./tests/.artifacts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "tests/report", open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: webUrl,
    channel: browserChannel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "public",
      testMatch: /smoke\.spec\.ts|catalogue\.spec\.ts|auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "customer",
      testMatch: /booking-flow\.spec\.ts|dashboard\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: join(authDir, "customer.json"),
      },
    },
    {
      name: "staff",
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: join(authDir, "admin.json"),
      },
    },
    {
      name: "partner",
      testMatch: /partner\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: join(authDir, "vendor.json"),
      },
    },
    {
      name: "responsive",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // The spec signs in through the login form itself, so it needs no
      // storageState: a pre-authenticated context would hide the cookie
      // attributes and the redirect guards this suite is asserting.
      name: "security",
      testMatch: /security\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      name: "savarigo-api",
      command: "npx nest start",
      cwd: "../api",
      url: `${apiUrl}/api/v1/health`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
        PORT: "4100",
        // The registration journey reads the one-time code straight off the
        // screen; outside development the API never exposes it.
        AUTH_DEBUG_OTP: "true",
      },
    },
    {
      name: "savarigo-web",
      command: `npx next dev --turbopack -p ${new URL(webUrl).port}`,
      url: webUrl,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        API_URL: `${apiUrl}/api/v1`,
        NEXT_PUBLIC_API_URL: `${apiUrl}/api/v1`,
      },
    },
  ],
});

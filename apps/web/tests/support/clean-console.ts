import { test as base, expect } from "@playwright/test";
import { watchConsole } from "./session";

/**
 * Every page a rider or an operator touches has to hydrate cleanly: a React
 * hydration failure or an uncaught error is a production incident that a
 * visible-content assertion will never notice. Requests cancelled by a
 * navigation are normal browser behaviour, so those are ignored.
 */
const ABORTED = /net::ERR_ABORTED|AbortError|The user aborted a request/i;

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors = watchConsole(page);
      await use(errors);
      const real = errors.filter((message) => !ABORTED.test(message));
      expect(real, real.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

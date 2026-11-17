/**
 * Windows machines whose application-control policy refuses to spawn the
 * Playwright-managed Chromium fall back to the system Chrome/Edge build.
 * Set E2E_BROWSER_CHANNEL to "" (or run on CI) to use the bundled browser.
 */
export const browserChannel = (() => {
  if (process.env.E2E_BROWSER_CHANNEL !== undefined) {
    return process.env.E2E_BROWSER_CHANNEL || undefined;
  }
  return process.platform === "win32" ? "chrome" : undefined;
})();

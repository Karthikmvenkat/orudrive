import { expect, type Page } from "@playwright/test";

/**
 * A cold dev bundle ships the markup for a route long before React has
 * attached its handlers to it. Anything typed in that window is invisible to
 * the component state, and a click in it does nothing at all — the form simply
 * never submits. React leaves a `__reactFiber$…` key on a node as it hydrates
 * it, so that key is the cheapest proof that the element is really interactive.
 */
export async function waitForHydration(page: Page, selector: string) {
  await expect
    .poll(
      async () =>
        page.evaluate((target) => {
          const node = document.querySelector(target);
          if (!node) return false;
          return Object.getOwnPropertyNames(node).some((key) => key.startsWith("__reactFiber$"));
        }, selector),
      { timeout: 45_000, message: `${selector} never became interactive` },
    )
    .toBe(true);
}

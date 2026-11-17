import { expect, test } from "./support/clean-console";
import { waitForHydration } from "./support/hydration";
import { CUSTOMER_EMAIL, signIn } from "./support/session";

/**
 * Phase 5 security checks for the site itself: the headers a browser acts on,
 * where the session tokens live, what the server-to-server proxy will forward,
 * and whether a typed payload can execute. The API-side half of this lives in
 * `apps/api/test/security.e2e-spec.ts`.
 */
test.describe("site security", () => {
  test("a page response carries the headers that keep it boring to a browser", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    const headers = response?.headers() ?? {};

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");

    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    // The payment sheet is the only third-party script the site runs.
    expect(csp).toContain("https://checkout.razorpay.com");
  });

  test("the BFF routes never cache an authenticated response", async ({ page }) => {
    const response = await page.request.get("/api/proxy/notifications/unread-count");

    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("the session lives in httpOnly cookies and nowhere a script can read", async ({
    page,
    context,
  }) => {
    await signIn(page, CUSTOMER_EMAIL);

    const authCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sg_"),
    );
    expect(authCookies.map((cookie) => cookie.name).sort()).toEqual(["sg_access", "sg_refresh"]);
    for (const cookie of authCookies) {
      expect(cookie.httpOnly, `${cookie.name} must not be readable from JS`).toBe(true);
      expect(cookie.sameSite).toBe("Lax");
      expect(cookie.path).toBe("/");
    }

    // A JWT in storage would hand any injected script a session; none belongs there.
    const stored = await page.evaluate(() => {
      const values = [
        ...Object.values(localStorage),
        ...Object.values(sessionStorage),
        document.cookie,
      ];
      return values.filter((value) => value.includes("eyJ"));
    });
    expect(stored).toEqual([]);
  });

  test("the proxy only forwards the roots it was built for", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const authRoot = await page.request.post("/api/proxy/auth/login", {
      data: { email: "x@example.com", password: "y" },
      headers: { "content-type": "application/json" },
    });
    expect(authRoot.status()).toBe(404);
    expect((await authRoot.json()).code).toBe("PROXY_ROUTE_NOT_ALLOWED");

    for (const target of [
      "/api/proxy/health",
      "/api/proxy/../api/v1/admin/overview",
      "/api/proxy/vehicles/..%2F..%2Fhealth",
      "/api/proxy/vehicles/%252e%252e/admin/overview",
    ]) {
      const response = await page.request.get(target);
      // Either the allowlist or the path check answers; what must never happen
      // is the proxy quietly reaching a route outside /api/v1.
      expect([400, 404], `${target} -> ${await response.text()}`).toContain(response.status());
      // A `..` written into the path is folded away by the client before the
      // request is even sent, so that one lands on Next's own 404 page rather
      // than on the proxy. Anything that does reach the proxy refuses with a
      // machine-readable code.
      const body = await response.json().catch(() => null);
      if (body) expect(body.code ?? "", target).not.toBe("");
    }
  });

  test("a script payload typed into the search stays text", async ({ page }) => {
    const payload = "<img src=x onerror=\"window.__pwned = 'executed'\">";
    // The listings page never reflects `?q=` into the markup, so a payload that
    // arrives by URL has nowhere to land; typing it is the surface that does
    // reach the DOM, because the term goes straight back into the tree.
    await page.goto(`/cars?q=${encodeURIComponent(payload)}`, { waitUntil: "domcontentloaded" });
    await waitForHydration(page, 'input[aria-label="Search vehicles"]');

    await page.getByLabel("Search vehicles").fill(payload);
    await expect(page.getByLabel("Search vehicles")).toHaveValue(payload);

    await expect(page.locator("main img[src='x']")).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as never as { __pwned?: string }).__pwned),
    ).toBeUndefined();
    // Typed as a term, not parsed as markup: the filter simply matches nothing.
    await expect(
      page.getByRole("heading", { name: "No vehicles found" }),
    ).toBeVisible();
  });

  test("a login only redirects where the site itself lives", async ({ page }) => {
    await page.goto("/login?next=//evil.example/steal", { waitUntil: "load" });
    await page.getByRole("heading", { name: "Welcome back!" }).waitFor();
    await signIn(page, CUSTOMER_EMAIL);

    const url = new URL(page.url());
    expect(url.hostname).toBe("localhost");
    expect(url.pathname).not.toContain("steal");
  });

  test("checkout never collects a card number on our own page", async ({ page }) => {
    await signIn(page, CUSTOMER_EMAIL);
    await page.goto("/cars", { waitUntil: "domcontentloaded" });
    await page.locator('main h3 a[href^="/vehicles/"]').first().click();
    await page.locator("aside").getByRole("button", { name: "Book This Vehicle" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // The card option exists, but the card itself belongs to the gateway: no
    // number, expiry or CVV field is rendered or posted by this site.
    const fields = await page.locator("main input").evaluateAll((nodes) =>
      nodes.map((node) => ({
        type: (node as HTMLInputElement).type,
        name: (node as HTMLInputElement).name,
        label: node.closest("div")?.parentElement?.textContent?.slice(0, 40) ?? "",
      })),
    );
    const leaked = fields.filter((field) =>
      /cvv|cvc|card.?number|expiry/i.test(`${field.name} ${field.label}`),
    );
    expect(leaked).toEqual([]);
  });
});

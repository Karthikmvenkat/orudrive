#!/usr/bin/env node
/**
 * Phase 5 page-weight baseline.
 *
 * Loads the real pages in Chrome and reports what a visitor actually downloads.
 * Point it at a production build (`next start`), not the dev server: Turbopack
 * in development ships unminified chunks and optimises images on first request,
 * so its numbers describe the toolchain rather than the site.
 *
 *   WEB_URL=http://localhost:3005 node scripts/perf-page-weight.mjs
 */
const webUrl = (process.env.WEB_URL ?? "http://localhost:3005").replace(/\/$/, "");
const repeat = Number(process.env.PERF_REPEATS ?? 3);

const { chromium } = await import("@playwright/test");

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

async function launch() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

const browser = await launch();

// Real slugs, taken from the running site rather than guessed from the seed.
const slugList = await (async () => {
  try {
    const response = await fetch(`${webUrl}/api/proxy/vehicles?limit=3`);
    const body = await response.json();
    return (body.data ?? []).map((vehicle) => `/vehicles/${vehicle.slug}`);
  } catch {
    return [];
  }
})();

const routes = [
  "/",
  "/cars",
  ...(slugList.length ? [slugList[0]] : []),
  "/login",
  ...(process.env.PERF_ROUTES ? process.env.PERF_ROUTES.split(",") : []),
];

const rows = [];
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const perType = new Map();
  const largest = [];
  let requests = 0;
  let transferred = 0;

  page.on("requestfinished", (request) => {
    void (async () => {
      const response = await request.response();
      if (!response) return;
      const size = (await response.body().catch(() => null))?.length ?? 0;
      requests += 1;
      transferred += size;
      const type = request.resourceType();
      perType.set(type, (perType.get(type) ?? 0) + size);
      largest.push({ url: request.url().replace(webUrl, ""), size });
    })();
  });

  const timings = [];
  for (let i = 0; i < repeat; i += 1) {
    const response = await page.goto(webUrl + route, { waitUntil: "load" });
    const nav = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0];
      return {
        ttfb: entry.responseStart - entry.requestStart,
        dcl: entry.domContentLoadedEventEnd - entry.startTime,
        load: entry.loadEventEnd - entry.startTime,
      };
    });
    timings.push({ ...nav, status: response?.status() ?? 0 });
  }

  // The response bodies are read off the page event, so let the last ones land.
  await page.waitForTimeout(750);

  const ttfbs = timings.map((timing) => timing.ttfb).sort((a, b) => a - b);
  largest.sort((a, b) => b.size - a.size);
  rows.push({
    route,
    status: timings[0].status,
    ttfb: percentile(ttfbs, 0.5),
    dcl: Math.round(timings.reduce((sum, t) => sum + t.dcl, 0) / timings.length),
    load: Math.round(timings.reduce((sum, t) => sum + t.load, 0) / timings.length),
    // Events accumulate over every repeat, so report the weight of one load.
    requests: Math.round(requests / repeat),
    transferred: transferred / repeat,
    byType: [...perType.entries()]
      .map(([type, bytes]) => [type, bytes / repeat])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, bytes]) => `${type} ${kb(bytes)}`)
      .join(", "),
    top: [...new Map(largest.map((entry) => [entry.url, entry])).values()]
      .sort((a, b) => b.size - a.size)
      .slice(0, 2)
      .map((entry) => `${entry.url} ${kb(entry.size)}kB`)
      .join(" · "),
  });
  await context.close();
}

await browser.close();

console.log(
  `Against ${webUrl}, ${repeat} passes per route. Bytes are decoded bodies, so images ` +
    "arrive as the AVIF/WebP a browser asked for rather than the source file in `public/images`.",
);
console.log("");
console.log(
  "| Route | Status | TTFB ms | DOMContentLoaded ms | Load ms | Requests | Decoded kB | Largest types | Biggest responses |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const row of rows) {
  console.log(
    `| \`${row.route}\` | ${row.status} | ${row.ttfb.toFixed(0)} | ${row.dcl} | ${row.load} | ` +
      `${row.requests} | ${kb(row.transferred)} | ${row.byType} | ${row.top} |`,
  );
}

#!/usr/bin/env node
/**
 * Phase 5 performance baseline.
 *
 * Measures the API the way the site actually calls it: per-endpoint latency
 * percentiles, a concurrent read pass, and the PostgreSQL query plans behind
 * the three hottest statements. Output is markdown, so the run can be pasted
 * straight into the testing report.
 *
 *   node --env-file=.env scripts/perf-baseline.mjs
 *
 * The API must already be running. The load pass floods one IP, so start that
 * instance with a raised limiter budget (THROTTLE_LIMIT) or expect 429s.
 */
import { PrismaClient } from "@prisma/client";

const apiBase = (process.env.API_URL ?? "http://localhost:4200/api/v1").replace(/\/$/, "");
const samples = positive(process.env.PERF_SAMPLES, 40);
const concurrency = positive(process.env.PERF_CONCURRENCY, 25);
const loadMs = positive(process.env.PERF_DURATION_MS, 5_000);
const password = process.env.PERF_PASSWORD ?? "SavariGo@2026";
const riderEmail = process.env.PERF_RIDER_EMAIL ?? "karthik@email.com";
const adminEmail = process.env.PERF_ADMIN_EMAIL ?? "admin@savarigo.com";

function positive(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function request(path, { token, method = "GET", body } = {}) {
  const started = performance.now();
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Draining the body is what makes the number comparable to a browser.
  const text = await response.text();
  return { ms: performance.now() - started, status: response.status, json: safeJson(text) };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function login(email) {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (response.status >= 400) {
    throw new Error(`login as ${email} failed with ${response.status}: ${JSON.stringify(response.json)}`);
  }
  return response.json.accessToken;
}

async function sample(label, path, options) {
  const timings = [];
  const failures = new Map();
  for (let i = 0; i < samples; i += 1) {
    const { ms, status } = await request(path, options);
    timings.push(ms);
    if (status >= 400) failures.set(status, (failures.get(status) ?? 0) + 1);
  }
  timings.sort((a, b) => a - b);
  return {
    label,
    path,
    p50: percentile(timings, 0.5),
    p95: percentile(timings, 0.95),
    max: timings[timings.length - 1] ?? 0,
    failures: [...failures.entries()].map(([status, count]) => `${status}x${count}`).join(" ") || "-",
  };
}

/** Fixed-work concurrency for a fixed time: closest thing to a load test without a driver. */
async function loadPass(label, path, options) {
  const timings = [];
  const statuses = new Map();
  const deadline = Date.now() + loadMs;
  let shortest = Infinity;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (Date.now() < deadline) {
        const { ms, status } = await request(path, options);
        timings.push(ms);
        statuses.set(status, (statuses.get(status) ?? 0) + 1);
        shortest = Math.min(shortest, ms);
      }
    }),
  );

  timings.sort((a, b) => a - b);
  const elapsed = loadMs / 1000;
  return {
    label,
    path,
    requests: timings.length,
    rps: timings.length / elapsed,
    p50: percentile(timings, 0.5),
    p95: percentile(timings, 0.95),
    p99: percentile(timings, 0.99),
    fastest: shortest === Infinity ? 0 : shortest,
    statuses: [...statuses.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}:${n}`).join(" ") || "-",
  };
}

/** Runs EXPLAIN and keeps the lines a reviewer needs: scans, times, buffers. */
async function plan(prisma, label, sql) {
  const rows = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
  const lines = rows.map((row) => row["QUERY PLAN"]);
  const scan = lines.filter((line) => /Scan|CTE|Subplan/.test(line)).map((line) => line.trim());
  const timing = lines.filter((line) => /Time:|Buffers:|rows=/.test(line));
  return { label, scan, timing };
}

function table(rows, columns) {
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const rule = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((c) => (typeof c.value === "function" ? c.value(row) : row[c.key])).join(" | ")} |`,
  );
  return [header, rule, ...body].join("\n");
}

const prisma = new PrismaClient();
const markdown = [];
const startedAt = new Date().toISOString();

markdown.push(`# Performance baseline`, "", `Run: ${startedAt} (UTC)`);
markdown.push(
  `API \`${apiBase}\`, ${samples} sequential samples per endpoint, ` +
    `load pass ${concurrency} concurrent readers for ${loadMs / 1000}s.`,
);

const [riderToken, adminToken] = await Promise.all([login(riderEmail), login(adminEmail)]);

// The detail and calendar rows need identifiers from the live catalogue.
const firstPage = (await request("/vehicles?page=1&limit=12")).json;
const vehicle = firstPage?.data?.[0];
if (!vehicle) throw new Error("No vehicles returned; seed the database before measuring.");

const window = {
  from: new Date(Date.now() + 20 * 86_400_000).toISOString(),
  to: new Date(Date.now() + 24 * 86_400_000).toISOString(),
};

const latencyRows = [
  await sample("Health check", "/health"),
  await sample("Fleet page (12 cards)", "/vehicles?page=1&limit=12&sort=popular"),
  await sample("Fleet search", `/vehicles?page=1&limit=12&q=${encodeURIComponent("activa")}`),
  await sample("Filtered fleet", "/vehicles?page=1&limit=12&maxPrice=1200&sort=price_asc"),
  await sample("Vehicle detail", `/vehicles/${vehicle.id}`),
  await sample(
    "Availability calendar",
    `/vehicles/${vehicle.id}/availability?from=${window.from}&to=${window.to}`,
  ),
  await sample("Locations", "/locations"),
  await sample("Categories", "/categories"),
  await sample("Rider bookings", "/bookings/me?page=1&limit=12", { token: riderToken }),
  await sample("Unread notifications", "/notifications/unread-count", { token: riderToken }),
  await sample("Admin overview", "/admin/overview", { token: adminToken }),
];

markdown.push("", "## Endpoint latency", "");
markdown.push(
  table(latencyRows, [
    { label: "Endpoint", key: "label" },
    { label: "Path", value: (r) => `\`${r.path}\`` },
    { label: "p50 ms", value: (r) => r.p50.toFixed(1) },
    { label: "p95 ms", value: (r) => r.p95.toFixed(1) },
    { label: "max ms", value: (r) => r.max.toFixed(1) },
    { label: "failures", key: "failures" },
  ]),
);

const load = await loadPass("Fleet page under load", "/vehicles?page=1&limit=12&sort=popular");
const loadAuthed = await loadPass("Rider bookings under load", "/bookings/me?page=1&limit=12", {
  token: riderToken,
});

markdown.push("", "## Concurrent reads", "");
markdown.push(
  `The limiter is per IP, so this pass runs against an instance started with ` +
    `\`THROTTLE_LIMIT\` raised. At the production default (120 req/60s) these numbers are 429s, ` +
    `which is the intended behaviour rather than a defect.`,
  "",
);
markdown.push(
  table([load, loadAuthed], [
    { label: "Workload", key: "label" },
    { label: "Requests", value: (r) => String(r.requests) },
    { label: "req/s", value: (r) => r.rps.toFixed(1) },
    { label: "p50 ms", value: (r) => r.p50.toFixed(1) },
    { label: "p95 ms", value: (r) => r.p95.toFixed(1) },
    { label: "p99 ms", value: (r) => r.p99.toFixed(1) },
    { label: "fastest ms", value: (r) => r.fastest.toFixed(1) },
    { label: "statuses", key: "statuses" },
  ]),
);

const plans = [
  await plan(
    prisma,
    "Fleet list (status + popularity + page)",
    `SELECT "id", "name", "fromPrice" FROM "vehicles" WHERE "status" = 'AVAILABLE' ` +
      `ORDER BY "popular" DESC, "rating" DESC, "createdAt" DESC LIMIT 12 OFFSET 0`,
  ),
  await plan(
    prisma,
    "Availability overlap (the booking concurrency guard)",
    `SELECT "id" FROM "vehicle_availability" WHERE "vehicleId" = '${vehicle.id}' ` +
      `AND "status" IN ('BOOKED','BLOCKED','MAINTENANCE') AND "startsAt" < '${window.to}' ` +
      `AND "endsAt" > '${window.from}' ORDER BY "startsAt" ASC LIMIT 1`,
  ),
  await plan(
    prisma,
    "Rider booking list",
    `SELECT b."id" FROM "bookings" b WHERE b."customerId" = ` +
      `(SELECT "id" FROM "users" WHERE "email" = '${riderEmail}') ORDER BY b."pickupAt" DESC LIMIT 12`,
  ),
];

markdown.push("", "## Query plans", "");
for (const entry of plans) {
  markdown.push(`### ${entry.label}`, "", "```", ...entry.scan, "```", "");
  markdown.push("```", ...entry.timing, "```");
}

const indexes = await prisma.$queryRawUnsafe(
  `SELECT tablename, indexname FROM pg_indexes ` +
    `WHERE schemaname = 'public' AND tablename IN ` +
    `('vehicles','vehicle_images','vehicle_availability','pricing','bookings','users') ` +
    `ORDER BY tablename, indexname`,
);
markdown.push("", "## Indexes on the hot tables", "");
const grouped = new Map();
for (const row of indexes) {
  const list = grouped.get(row.tablename) ?? [];
  list.push(row.indexname);
  grouped.set(row.tablename, list);
}
for (const [table_, names] of grouped) {
  markdown.push(`- **${table_}** (${names.length}): ${names.join(", ")}`);
}

const counts = await prisma.$queryRawUnsafe(
  `SELECT (SELECT count(*) FROM "vehicles")::bigint AS vehicles, ` +
    `(SELECT count(*) FROM "bookings")::bigint AS bookings, ` +
    `(SELECT count(*) FROM "vehicle_availability")::bigint AS availability_rows, ` +
    `(SELECT count(*) FROM "users")::bigint AS users`,
);
markdown.push("", "## Data volume measured against", "");
markdown.push("```json", JSON.stringify(counts[0], (k, v) => (typeof v === "bigint" ? Number(v) : v), 2), "```");

console.log(markdown.join("\n"));
await prisma.$disconnect();

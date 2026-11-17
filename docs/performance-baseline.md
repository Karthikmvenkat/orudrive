# SavariGo — Performance Baseline (Phase 5)

Measured on 2026-11-16 on the development laptop (Windows, Node 24.22, embedded PostgreSQL 16).
Two scripts produce every number here, so the baseline is repeatable rather than a screenshot:

| What | Command | Needs |
| --- | --- | --- |
| API latency, load, query plans, index inventory | `npm run perf:api` (`apps/api/scripts/perf-baseline.mjs`) | a running API, `API_URL`, `DATABASE_URL` |
| Page weight and navigation timings in Chrome | `npm run perf:weight --workspace=web` | a **production** build served by `next start` (`WEB_URL`, default `http://localhost:3005`) |
| Route/First-Load-JS table | `npm run build --workspace=web` | the API reachable, because SSR pages prerender |

The load pass floods one IP, so run the instance it targets with the limiter budget raised:

```
DATABASE_URL=… PORT=4200 THROTTLE_LIMIT=20000 node dist/main.js
```

`THROTTLE_LIMIT` / `THROTTLE_TTL_MS` are now environment variables (`apps/api/src/common/security/security.module.ts`);
the production default stays 120 requests per 60 seconds per IP.

## 1. API endpoint latency

40 sequential samples per endpoint, warm cache, seeded database (`savari_test`).

| Endpoint | Path | p50 ms | p95 ms | max ms | failures |
| --- | --- | --- | --- | --- | --- |
| Health check | `/health` | 15.3 | 16.7 | 17.5 | none |
| Fleet page (12 cards) | `/vehicles?page=1&limit=12&sort=popular` | 15.7 | 19.5 | 21.9 | none |
| Fleet search | `/vehicles?page=1&limit=12&q=activa` | 15.1 | 16.8 | 17.3 | none |
| Filtered fleet | `/vehicles?page=1&limit=12&maxPrice=1200&sort=price_asc` | 15.0 | 19.6 | 20.9 | none |
| Vehicle detail | `/vehicles/{id}` | 15.3 | 17.6 | 18.2 | none |
| Availability calendar | `/vehicles/{id}/availability?from=…&to=…` | 15.1 | 17.2 | 24.9 | none |
| Locations | `/locations` | 15.4 | 16.8 | 18.5 | none |
| Categories | `/categories` | 15.3 | 16.8 | 17.3 | none |
| Rider bookings | `/bookings/me?page=1&limit=12` | 15.6 | 27.0 | 27.8 | none |
| Unread notifications | `/notifications/unread-count` | 15.2 | 16.8 | 16.9 | none |
| Admin overview | `/admin/overview` | 15.2 | 22.7 | 131.9 | none |

Every read sits in a ~15 ms band, which is Node + Prisma + one round trip rather than the
database (execution times below are under 0.11 ms). Two endpoints stand out:
`/bookings/me` because a booking pulls images, pricing items, payment and driver in one include,
and `/admin/overview`, whose single 131.9 ms sample is an aggregate fan-out on a cold stats path.

## 2. Concurrent reads

25 parallel readers for 5 seconds against the throttle-raised instance.

| Workload | Requests | req/s | p50 ms | p95 ms | p99 ms | fastest ms | statuses |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fleet page | 1044 | 208.8 | 113.9 | 190.0 | 269.5 | 27.8 | 200:1044 |
| Rider bookings | 1021 | 204.2 | 118.7 | 153.5 | 186.4 | 78.6 | 200:1021 |

Roughly 200 req/s per Node process with zero errors, degrading from 15 ms to ~115 ms p50 as
queueing begins — the shape to expect from one CPU-bound instance. A VPS deployment should run
`node dist/main.js` behind nginx with `rate_limit` at the edge; a single instance is the unit being
scaled, not the thing that has to absorb a flash crowd.

At the production limiter default these same passes return 429 with `code: "RATE_LIMITED"`, which
is the intended guard, not a failure.

## 3. Query plans

`EXPLAIN (ANALYZE, BUFFERS)` for the three statements the hot paths generate, all buffers in the
shared cache:

| Statement | Plan | Planning | Execution |
| --- | --- | --- | --- |
| Fleet list (`status` + popularity + page) | `Index Scan using vehicles_status_fromPrice_idx` → Sort → Limit, 13 rows, 284 buffers | 1.512 ms | 0.102 ms |
| Availability overlap (the double-booking guard) | `Seq Scan on vehicle_availability`, 20 rows, 156 buffers | 1.075 ms | 0.046 ms |
| Rider booking list | `Seq Scan on bookings` (24 rows) + `Seq Scan on users` (14 rows) | 1.785 ms | 0.110 ms |

Sequential scans here are the planner being right, not lazy: the whole database is 14 vehicles,
26 bookings, 20 availability rows and 14 users. Indexes for every one of these predicates exist and
are listed in `pg_indexes`; they will be chosen as the tables grow. Two consequences to re-measure
once the catalogue is production-sized:

- the `q` search is a `contains` (`ILIKE`) over `name`, `brand` and `description`, which cannot use
  a btree index — a `pg_trgm` GIN index is the fix, and it belongs in a migration rather than in
  application code;
- `/admin/overview` aggregates over `bookings` and `payments` with `(status, paymentStatus)` and
  `createdAt` indexes available, but its filters are wide, so it is the first endpoint that will
  want a materialised stats path.

## 4. Integrity indexes — a real finding

The first inventory run listed four indexes on `vehicle_availability` and **no** exclusion
constraint, while the development database had both `btree_gist` and
`vehicle_availability_no_overlap`. The test database had been rebuilt with `prisma db push`,
which cannot reproduce the hand-written DDL at the end of
`prisma/migrations/20261109000100_init/migration.sql`. In that state booking scenario 1 (two
riders, one vehicle) was enforced only by the application's pre-check — the guard that exists
precisely for the race window.

Restored, and now covered by a test that fails loudly if it drifts again:

- `apps/api/test/overlap-guard.e2e-spec.ts` reserves a window, attempts an overlapping insert
  straight through Prisma, and asserts the rejection names `vehicle_availability_no_overlap`;
  it also pins the `'[)'` range semantics (an adjacent window is allowed) and the partial
  predicate (an `AVAILABLE` row may overlap a booked one).
- `apps/api/src/common/utils/overlap-violation.ts` recognises that rejection, and both
  `BookingsService.create` and `AvailabilityService.createBlock` turn it into the same
  `409 BOOKING_CONFLICT` / `409 AVAILABILITY_OVERLAP` their pre-check produces. Before this, the
  loser of a genuine race would have received a 500.

After the fix the inventory reports five indexes on the table, including
`vehicle_availability_no_overlap`. CI must therefore build the test schema with
`prisma migrate deploy` (never `db push`) — recorded as a requirement for the pipeline task.

## 5. Front-end bundle

From `next build --turbopack` (47 static pages generated, no errors):

| Route | Route size | First Load JS |
| --- | --- | --- |
| shared by every route | — | 146 kB |
| `/` | 13.1 kB | 245 kB |
| `/cars` | 0 B | 203 kB |
| `/vehicles/[slug]` | 14.2 kB | 199 kB |
| `/login` | 8.46 kB | 279 kB |
| `/checkout` | 11.5 kB | 313 kB |
| `/list-your-vehicle` | 5.38 kB | 307 kB |
| `/admin/*` | 0 B | 183 kB |
| middleware | 39.6 kB | — |

Three ESLint warnings (unused imports in two admin pages and the dashboard sidebar) do not fail the
build; they are listed in the testing report as cleanup.

## 6. Page weight in a real browser

Production build (`next start`), Chrome at 1440×900, 3 passes per route, fresh context per route —
so this is a first-visit, cold-HTTP-cache picture. Bytes are decoded response bodies.

| Route | TTFB ms | DOMContentLoaded ms | Load ms | Requests | Decoded kB | Largest types |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 22 | 366 | 411 | 37 | 1665.1 | script 992.2, document 313.7, fetch 103.6 |
| `/cars` | 107 | 343 | 360 | 39 | 1368.7 | script 926.5, fetch 147.5, document 117.4 |
| `/vehicles/ola-s1-pro` | 76 | 303 | 312 | 33 | 1426.1 | script 915.3, fetch 147.4, document 144.8 |
| `/login` | 9 | 52 | 172 | 25 | 1426.6 | script 1128.7, stylesheet 96.7, fetch 90.7 |

- Static routes (`/`, `/login`) answer in 9–22 ms; the dynamic SSR routes (`/cars` at 107 ms,
  vehicle detail at 76 ms) include the server-side API call in TTFB, which matches the API numbers
  above.
- Nothing reaches 1 s of load time on a warm local server; the band 300–410 ms is dominated by
  JavaScript, not by images or CSS.
- One shared chunk (`a2472a5eeda28660.js`, 460.9 kB decoded) ships on every route including the
  login page. That is the single clearest bundle win available — probably the animation/Radix
  graph — and it is worth a dedicated look before mobile work starts, since the same bundle would
  be loaded inside a WebView.

## 7. Imagery

`public/images` holds 24 MB across 38 JPEGs, the largest at 1.61 MB. Every image on the site goes
through `next/image` (no raw `<img>` in `src`), so the browser never asks for the source file: a
640 px rendition of `hyundai-i20.jpg` — 1 098 kB at source — was served as 47 kB over the wire
(requesting `/_next/image?...&w=640&q=75` without AVIF/WebP in `Accept`, i.e. the JPEG floor; a
browser gets less again). Self-hosted deployments must keep the image optimizer reachable (it needs
`sharp`) and must not cache-bust it through nginx. `sharp` is an optional dependency of `next` whose
binaries are resolved per platform at install time, and the committed lockfile — produced on Windows
— records only `@img/sharp-win32-x64`, so a Linux image gets no usable binary unless it installs one
itself; `apps/web/Dockerfile` reinstalls the locked version for the container's platform and requires
it in the same layer, which fails the build instead of failing every image request in production.

## 8. What this baseline does and does not say

It is a **shape** measurement on seed-scale data: the same commands, re-run against production
volume, are the acceptance comparison. Proposed thresholds for the first production week, all of
which this environment currently satisfies at seed scale:

| Signal | Baseline today | Target |
| --- | --- | --- |
| API read p95, single instance | 17–27 ms | &lt; 250 ms |
| API read throughput per instance | ~205 req/s | &gt; 150 req/s |
| `/admin/overview` p95 | 22.7 ms (max 131.9) | &lt; 400 ms |
| SSR TTFB | 76–107 ms | &lt; 400 ms |
| Page load (desktop, warm origin) | 312–411 ms | &lt; 2 s |
| First Load JS, marketing routes | 203–245 kB | ≤ 300 kB |

Not measured here, and called out as gaps rather than as passes: Core Web Vitals from a real
device or field (Lighthouse CI), database behaviour beyond seed scale, multi-region latency behind
Cloudflare, and payment-gateway round-trip time (Razorpay's own checkout, which the CSP now
permits but which this environment cannot reach without live keys).

# SavariGo — Testing report

Run on 2026-11-16 on the development machine: Windows, Node 24, PostgreSQL 16, seed-scale
data in `savarigo` (the development database, and the one the browser pass wrote to — see
section 7) and `savari_test` (what the Jest suites ran against). Every number below is copied
from the command output of that run, not from an earlier one.

## 1. Summary

| Suite | Command | Scope | Result |
| --- | --- | --- | --- |
| API, unit | `npm test --workspace=api` | 33 tests in 5 spec files | 33 passed |
| API, integration | same run | 111 tests in 6 e2e files, real PostgreSQL | 111 passed |
| API, coverage | `npm run test:cov --workspace=api` | same 144 tests | 62.4% statements, 23.0 s |
| Browser | `npm run test:e2e --workspace=web` | 52 tests, 8 spec files, 5 projects | 52 passed, 7.9 min |
| Types, API | `npm run typecheck --workspace=api` | whole workspace | clean |
| Types, web | `npx tsc --noEmit -p apps/web/tsconfig.json` | whole workspace | clean |
| Lint, web | `npm run lint --workspace=web` | ESLint flat config | 0 errors, 3 warnings |
| Build, web | `npm run build --workspace=web` | `next build --turbopack` | compiled in 11.1 s, 49 routes |

**196 automated assertions, 0 failures.** The three warnings are unused imports, listed in
section 6.

## 2. What the API integration suite proves

The e2e specs are the substance of the report: they boot the real Nest application, talk to a
migrated and seeded PostgreSQL 16, and assert on the rows that exist afterwards. One boundary is
faked in them — `test/payment-scenarios.e2e-spec.ts` installs a stand-in for
`api.razorpay.com` so signatures, replays and gateway failures are all provable without live
keys. The mail transport is not faked, it is simply never reached (`AUTH_DEBUG_OTP` prints the
code instead), which section 7 records as a gap rather than a pass.

| File | Tests | Covers |
| --- | --- | --- |
| `test/booking-scenarios.e2e-spec.ts` | 15 | Date-window validation (return before pickup, past pickup, the 90-day ceiling, malformed input rejected before any query), maintenance status, rider-versus-staff authorisation, overlapping windows, two simultaneous requests where only one may win, cancel and release plus double-cancel, illegal status transitions, expired access token and refresh-token-as-access, refresh rotation with family revocation on reuse, transaction rollback when a write fails mid-booking, payment for a nonexistent booking. |
| `test/payment-scenarios.e2e-spec.ts` | 21 | Checkout signature mismatch, payment against a different order, underpayment, gateway-reported failure, refund of an uncaptured payment, order for a closed booking, cross-customer verification, gateway unreachable then recovered, gateway error surfaced as 502, order left payable when verification loses the network, idempotency-key replay, partial refunds with state tracking, refund on cancellation, queued refund held until the webhook confirms, finance-only refund, exactly-once apply of a replayed captured event, payment for a booking cancelled mid-checkout, `payment.failed` marking an order failed, unsigned and forged webhooks, events about records the instance does not own, payments invisible to other riders. |
| `test/security.e2e-spec.ts` | 65 | 46 authorisation-surface assertions (each privileged route checked twice — closed to a signed-in rider, closed to nobody at all), 6 ownership probes that a rider cannot read a foreign booking, a vendor cannot cancel outside their fleet or reach a stranger's notifications, 9 injection-shaped payloads (SQL, stacked SQL, `UNION SELECT`, `<script>`, JNDI, path traversal, double-encoded) plus a confirmation the schema still stands afterwards, the response-header/CORS/trace-id/no-secret-leak set, three forged-token cases (wrong secret, `alg: none`, missing type), and 4 rate-limiting assertions against the real `@nestjs/throttler` storage: password spray, anonymous logout, driver applications, and a public catalogue call that must stay inside its budget. |
| `test/overlap-guard.e2e-spec.ts` | 4 | The GiST exclusion constraint at the database level: a second reservation of an overlapping window is refused, a window that merely touches the boundary is allowed, statuses that do not reserve are ignored, and an unrelated database error is still reported as itself. |
| `test/auth-flow.e2e-spec.ts` | 1 | One journey: register, verify the 6-digit OTP, log in, read `/me`, refresh and see the token rotate, then replay the old one and get 401. |
| `test/api.e2e-spec.ts` | 5 | Health answers even when the database is down, the unauthenticated error envelope, unknown fields rejected before any query, a webhook without a signature refused, and the OpenAPI document listing every module. |

`test/booking-scenarios.e2e-spec.ts` and `test/payment-scenarios.e2e-spec.ts` between them are
the critical booking-and-money scenarios the phase asked for: 36 assertions, all of them about
either a state transition that must not happen or a write that must roll back.

The five unit specs (`src/**/*.spec.ts`, 33 tests) hold the rules that must not need a database
to prove: booking policy, price composition, OTP digests, password hashing, vehicle DTO parsing.

## 3. What the browser suite proves

Playwright runs one worker, serially, because throttler budgets and the seeded fleet are shared
state. Five projects, each spec file claimed by exactly one of them:

| Project | Tests | Covers |
| --- | --- | --- |
| `public` | 18 | Home hero and search widget, every marketing page's title and sections, footer links, skip link, branded 404, alt text and a console-error pass (7); wrong password without leaking the field, sign in → dashboard → sign out, staff lands in the console, registration and the e-mail code (5); search handing dates to the listing, seeded fleet narrowing, the filter sheet and its count, vehicle specifications and plans, booking from a vehicle page asking for login, the bikes route honouring a type query (6). |
| `customer` | 12 | The booking journey: reserve a vehicle, cancel a reservation from the dashboard, an online payment with its offline fallback, an inverted rental window refused, a booked-out window refused (5), and the dashboard's own seven pages. |
| `staff` | 7 | Control-room counters, every sidebar section, booking filter and reset, row action without navigation, audit trail, phone-width table, escape route out of the live API docs. |
| `responsive` | 8 | No horizontal scroll at 360/390/768/1024/1440, menu sheet on phone, full nav on desktop, search usable on a phone. |
| `security` | 7 | Response headers, `no-store` on BFF routes, session only in httpOnly cookies, proxy allow-list of API roots, a script payload typed into search stays text, post-login redirect confined to the site, no card number collected on our own page. |

## 4. Coverage

`npm run test:cov --workspace=api` — 62.36% statements, 28.66% branches, 40.66% functions,
61.89% lines. No threshold is configured, so the run reports rather than gates.

The distribution is the honest part:

| Module | Statements | Module | Statements |
| --- | --- | --- | --- |
| health | 100% | availability | 48.1% |
| payments | 86.8% | categories | 45.1% |
| bookings | 78.0% | reviews | 45.0% |
| auth | 69.4% | pricing | 43.1% |
| users | 67.0% | drivers | 43.0% |
| notifications | 58.0% | admin | 40.0% |
| vehicles | 52.0% | coupons | 34.2% |
| locations | 49.4% | | |

Where a wrong number costs money the suite is dense — `payments.service.ts` 82.5% and
`razorpay.service.ts` 97.4% lines. Where it is thin, the code is mostly a Prisma call behind a
validated DTO (`coupons`, `categories`, `drivers`, `locations`): reachable through the browser
suite and the API contract, but not asserted line by line. `pricing.service.ts` at 13.2% is the
one that deserves attention, because pricing is the part a customer argues about — the booking
specs cover its output through `booking-pricing.spec.ts` and the checkout journey, not its
branches. `notifications.service.ts` is thin for the same reason: the rows it writes are
asserted, the SMTP send path inside it (lines 75–90 and 169–324) is not.

Branch coverage of 28.7% overall is the same story in a single number: happy paths are asserted,
unusual-but-legal combinations are not.

## 5. Performance

Measured separately and repeatably in
[`performance-baseline.md`](performance-baseline.md); the headline against seed-scale data:

| Signal | Measured |
| --- | --- |
| API read latency | p50 ≈ 15 ms, p95 17–27 ms across 11 endpoints, no failures |
| Throughput, one Node instance | ~205 req/s at 25 parallel readers, zero errors |
| SSR TTFB | 9–22 ms static, 76–107 ms dynamic |
| Page load, desktop warm | 312–411 ms |
| First Load JS | 146 kB shared by every route; marketing routes 203–245 kB |

The baseline names its own gaps (Core Web Vitals from real devices, behaviour past seed scale,
gateway round trips) and this report does not repeat them as passes.

## 6. Static checks in detail

- API `tsc --noEmit`: no output, exit 0.
- Web `tsc --noEmit -p apps/web/tsconfig.json`: no output, exit 0.
- `next build --turbopack`: compiled successfully, 49 routes. 15 prerendered static (`○`), the
  other 34 server-rendered on demand (`ƒ`) — including every page that reads the catalogue, which
  is what makes the container build safe without a reachable API. Middleware 39.6 kB.
- ESLint, three warnings, all unused imports:
  `apps/web/src/app/(admin)/admin/settings/page.tsx:5` `AdminAction`,
  `apps/web/src/app/(admin)/admin/vehicles/page.tsx:23` `adminButtonSoft`,
  `apps/web/src/components/dashboard/sidebar.tsx:68` `user`.

## 7. What is not verified

Stated as gaps, not as passes.

- **The Docker images have never been built.** This machine has no `docker` CLI, so neither
  `docker compose build` nor the layer in `apps/web/Dockerfile` that resolves the Linux `sharp`
  binary has executed even once. The `images` job in `ci.yml` is the first real test of both
  Dockerfiles, and the CI passes in this report describe the source, not the images.
- **Neither workflow has run.** The repository has no commits and no remote, so `ci.yml` and
  `deploy.yml` are verified by YAML parsing and by executing their shell steps against stubs —
  including the release script, whose `ssh` was replaced by an echo. Action version pins were
  checked against each repository's latest release.
- **The nginx and certbot bootstrap sequence is unexecuted.** Its config parses and its
  `envsubst` template names only variables Compose sets, but no TLS handshake has been served.
- **Real payment traffic.** Razorpay is exercised through a mocked gateway and signed webhook
  fixtures; a test-mode key issuing an actual order has not been run, so gateway latency and the
  checkout iframe's own behaviour are unmeasured.
- **Email delivery.** `notifications.service.ts` covers the templates and the queue, not an SMTP
  server: nothing in this report proves a message reaches an inbox.
- **Load beyond seed scale**, multi-region latency, and Core Web Vitals from real devices.
- **The browser run reused the dev servers.** `playwright.config.ts` sets
  `reuseExistingServer: !process.env.CI`, and both servers were already listening on 3001 and
  4100, so this pass wrote through the development API against `savarigo`. From a cold checkout
  and in CI, Playwright starts both processes itself and points the API at `savari_test`.

## 8. How to reproduce

```bash
npm ci

# one-time: a disposable database, derived from the credentials already in apps/api/.env
node -e 'const {Client}=require("pg");const u=require("fs").readFileSync("apps/api/.env","utf8").match(/DATABASE_URL="([^"]+)"/)[1];const c=new Client({connectionString:u});c.connect().then(()=>c.query("CREATE DATABASE savari_test")).then(()=>console.log("savari_test created")).catch(e=>console.log("already there:",e.message)).finally(()=>c.end().catch(()=>{}));'

# point both variables at it, then put the schema and the fixture fleet inside
export TEST_DATABASE_URL="$(node -e 'console.log(require("fs").readFileSync("apps/api/.env","utf8").match(/DATABASE_URL="([^"]+)"/)[1].replace("/savarigo?","/savari_test?"))')"
export DATABASE_URL="$TEST_DATABASE_URL"
npm run db:generate --workspace=api
npm run db:deploy --workspace=api
npm run db:seed --workspace=api

npm test --workspace=api                      # 144 tests
npm run test:cov --workspace=api              # same, with the coverage table
npm run typecheck --workspace=api
npm run lint --workspace=web
npm run build --workspace=web

npm run test:e2e --workspace=web              # 52 tests; starts API and web if not running
npm run test:e2e:report --workspace=web       # HTML report with traces for failures
```

The e2e specs skip themselves without `TEST_DATABASE_URL`, so `npm test --workspace=api` on a
machine with no server still runs the 33 unit tests instead of failing. `createdb` is not on
this machine's PATH, which is why the block above uses the `pg` client the API already depends
on; any other client does the same job.

`npm run perf:api` and `npm run perf:weight --workspace=web` produce section 5; both are
documented in the baseline and both are excluded from CI on purpose.

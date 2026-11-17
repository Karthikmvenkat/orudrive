# SavariGo API

NestJS 11 + Prisma 6 + PostgreSQL 16 backend for SavariGo rentals, bike taxis
and driver services. The complete REST API lives under `/api/v1`:
authentication, catalogue, availability and pricing, bookings, Razorpay
payments and refunds, reviews, notifications, coupons and admin reporting.
Phase 4 wired the Next.js storefront, customer dashboard and admin console to
this API.

- API guide: [`docs/api.md`](docs/api.md) — endpoint map, payloads, pricing and
  cancellation rules, error codes, rate limits.
- Postman collection:
  [`docs/SavariGo.postman_collection.json`](docs/SavariGo.postman_collection.json)
- Database notes: [`docs/database.md`](docs/database.md)
- Swagger UI: <http://localhost:4000/docs>
- Deploying: [`deploy/README.md`](../../deploy/README.md) — the image in
  `Dockerfile`, the production Compose stack at the repository root and the
  nginx edge. `/docs` is intentionally not published on the public origin.

The Next.js app in `apps/web` consumes this API through a BFF (httpOnly
cookies + `/api/proxy`), with server-side rendering for the catalogue, customer
dashboard and staff admin console. See [`../web/README.md`](../web/README.md)
for the web setup and route map.

---

## Requirements

- Node.js 20+ (verified on 24)
- npm 10+ (workspaces)
- Docker Desktop, or any PostgreSQL 16 instance
- Nothing else — no global Nest or Prisma CLI required

## Quick start

```bash
# 1. Install from the repository root (workspaces)
npm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
# generate real secrets instead of the placeholders before deploying anywhere

# 3. Start PostgreSQL
cd apps/api
docker compose up -d
# Adminer UI (optional): docker compose --profile tools up -d
#   http://localhost:8080 — server: postgres, user/pass/db: savarigo

# 4. Create the schema and demo data
npm run db:deploy
npm run db:seed

# 5. Run the API
npm run dev
```

- API: <http://localhost:4000/api/v1>
- Swagger: <http://localhost:4000/docs>
- OpenAPI JSON: <http://localhost:4000/docs-json>
- Health: <http://localhost:4000/api/v1/health>

Ports come from `PORT` in `.env`. If 4000 is in use, change `PORT` and update
`API_URL` in `apps/web/.env.local` to match; the local demo in this workspace
runs the API on **4100** and Next.js on **3001**.

The API boots even when PostgreSQL is unreachable: `/health` reports
`status: "degraded"` and `database: "down"` instead of crashing. Prisma
connects lazily on first query.

## Commands

Run from `apps/api`, or from the repository root with `--workspace=api`
(root aliases such as `npm run dev:api` are listed below too).

| Command | What it does |
| --- | --- |
| `npm run dev` | Nest watch mode on port 4000 |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | `tsc --noEmit` over `src` and `prisma` |
| `npm test` | Jest: unit + HTTP end-to-end specs |
| `npm run test:unit` | Jest without `*-e2e-spec.ts` |
| `npm run test:cov` | Jest with coverage |
| `npm run db:validate` | Validate `prisma/schema.prisma` |
| `npm run db:format` | Format the schema |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate -- --name <change>` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply committed migrations (CI/production) |
| `npm run db:seed` | Recreate the development dataset |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and re-seed (destructive) |

Root aliases: `dev:web`, `dev:api`, `build:web`, `build:api`, `typecheck:api`,
`test:api`, `db:generate`, `db:migrate`, `db:deploy`, `db:seed`.

Five files under `test/` are the DB-backed integration suites — auth flow, booking
scenarios, payment scenarios, the availability overlap guard and the security suite. They
skip themselves unless `TEST_DATABASE_URL` points at a disposable database, so `npm test`
stays green on a machine with no server. Point it at a migrated, seeded database first:

```bash
npm run db:deploy --workspace=api && npm run db:seed --workspace=api
export TEST_DATABASE_URL="…/savari_test?schema=public"
npm test --workspace=api
```

33 of the 144 tests are the unit specs and need no database at all.
[`../../docs/testing-report.md`](../../docs/testing-report.md) lists what each suite proves.

## Layout

```
apps/api
├─ prisma/
│  ├─ schema.prisma              # 26 models, 17 enums
│  ├─ migrations/                # initial schema + Phase 3 migrations
│  └─ seed.ts                    # development dataset
├─ src/
│  ├─ main.ts                    # prefix, helmet, validation, CORS, Swagger
│  ├─ app.module.ts              # module graph and global guards
│  ├─ admin/                     # overview, settings, audit log, roles
│  ├─ auth/                      # register, login, refresh, OTP, passwords
│  ├─ users/, customers/         # profile and customer records
│  ├─ vehicles/, categories/     # catalogue
│  ├─ drivers/                   # driver profiles and assignment
│  ├─ availability/              # blocks, blackout windows
│  ├─ pricing/                   # day/week/month rates, fromPrice sync
│  ├─ bookings/                  # quote, create, cancel, status, assign
│  ├─ payments/                  # Razorpay orders, verify, refunds, webhook
│  ├─ coupons/                   # validate and manage discounts
│  ├─ reviews/                   # post-trip reviews and moderation
│  ├─ notifications/             # in-app and email notifications
│  ├─ locations/                 # hubs and pickup points
│  ├─ common/                    # Prisma, guards, filters, interceptors, mail
│  └─ health/                    # GET /api/v1/health
├─ test/                         # Jest e2e specs + env setup
├─ docs/
│  ├─ api.md                     # Phase 3 API guide
│  ├─ SavariGo.postman_collection.json
│  ├─ database.md                # conventions, catalogue, integrity rules
│  └─ erd.mmd                    # Mermaid ERD
├─ Dockerfile                    # three stages: npm ci → nest build → node:24-slim runner
├─ docker-compose.yml            # development postgres:16-alpine + optional adminer
└─ .env.example                  # every variable, no real secrets
```

## API surface

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`, `POST /auth/change-password` |
| Catalogue | `GET /vehicles`, `/vehicles/search`, `/vehicles/:slug`, `GET /vehicle-categories`, `GET /locations` |
| Availability | `GET /vehicles/:id/availability`, `/vehicles/:id/pricing`; staff `POST/DELETE /availability` |
| Bookings | `POST /bookings/quote`, `POST /bookings`, `GET /bookings/me`, `/bookings/me/:idOrCode`, `POST /bookings/:id/cancel`; staff `GET /bookings/manage`, `PATCH /bookings/:id/status`, `PATCH /bookings/:id/driver` |
| Payments | `POST /payments/orders`, `POST /payments/verify`, `GET /payments`; admin `GET /payments/manage`, `POST /payments/:id/refund`; public `POST /payments/webhook` |
| Reviews | `GET /vehicles/:id/reviews`, `POST /reviews`, `GET /reviews/me`; admin moderation |
| Notifications | `GET /notifications`, `/notifications/unread-count`, `PATCH /notifications/:id/read`, `/notifications/read-all`, `DELETE /notifications/:id`; admin broadcast |
| Admin | `GET /admin/overview`, `/admin/audit-logs`, `/admin/settings`, `PUT /admin/settings/:key`, `GET /admin/roles` |

Full request/response examples, role requirements and error codes live in
[`docs/api.md`](docs/api.md); the same payloads are pre-filled in the Postman
collection. Unknown request fields are rejected with `400` (`whitelist` +
`forbidNonWhitelisted`).

## Demo accounts

After seeding, every account uses password `SavariGo@2026`. Accounts are
created with `PENDING_VERIFICATION`; verify them with the OTP flow (or read
`devCode` in development) before logging in.

| Role | Email |
| --- | --- |
| Customer | `karthik@email.com` |
| Customer | `ananya@example.com` |
| Vendor | `vendor@savarigo.com` |
| Admin | `admin@savarigo.com` |

These exist for local development only.

## Security notes

- Secrets live in `apps/api/.env` (git-ignored); `.env.example` is the
  committed template. Startup fails fast if a required secret is missing.
- Access and refresh tokens are JWTs; only HMAC hashes of refresh tokens are
  stored. Refresh rotation detects reuse and revokes the whole token family.
- Passwords use scrypt (`scrypt$salt$hash`). OTP codes are 6 digits, hashed at
  rest, single-use and time-limited. `AUTH_DEBUG_OTP=true` echoes codes in
  non-production responses for local testing.
- Card numbers, expiry, CVV and card tokens are never collected, modelled or
  stored. Checkout happens in Razorpay's UI; the API keeps only opaque gateway
  references and verifies the signed checkout and webhook payloads.
- Payments fail closed: with `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` unset the
  API returns `503 PAYMENT_PROVIDER_NOT_CONFIGURED` instead of faking success.
- Money uses `Decimal(12,2)`, not floating point. Booking totals are always
  calculated server-side; client-supplied prices are ignored.
- The database blocks double bookings at the engine level with a GiST exclusion
  constraint, in addition to the application pre-check (see
  `docs/database.md` §4). Violations surface as `409 BOOKING_CONFLICT`.
- Global rate limits apply (`THROTTLE_*`), with tighter counters on login,
  registration, OTP and payment verification.
- Authenticated non-GET requests are written to `audit_logs` without request
  bodies; `/auth/` and `/payments/webhook` are excluded so credentials and
  signatures never reach the log.
- `helmet` sets security headers; CORS origins come from `CORS_ORIGINS`
  (default: web app on ports 3000 and 3001).

## Troubleshooting

**`Can't reach database server`** — PostgreSQL is not running or
`DATABASE_URL` is wrong. `docker compose ps` should show `savarigo-postgres`
healthy.

**`extension "btree_gist" is not available`** — install `postgresql-contrib`,
or let a database admin run the `CREATE EXTENSION` line from the migration
first.

**`409 BOOKING_CONFLICT`** — the requested window overlaps an existing
block/booking for that vehicle. This is expected protection.

**`503 PAYMENT_PROVIDER_NOT_CONFIGURED`** — set `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` to exercise real order creation. Webhooks additionally
need `RAZORPAY_WEBHOOK_SECRET`.

**`401` on every request** — send `Authorization: Bearer <accessToken>`.
Access tokens are short-lived (`JWT_ACCESS_TTL`); call `/auth/refresh`.

**Email not sent** — without `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER` the mail
service logs instead of sending. OTP delivery in that case is dev-only.

**Port 4000 in use** — change `PORT` in `.env`.

## Status

Verified in this environment: `prisma validate`, `prisma generate`,
`tsc --noEmit`, `nest build`, Jest unit suites (`booking-pricing`,
`booking-policy`, `password-service`) and the HTTP e2e suite (health, auth
guard envelope, validation errors, webhook signature rejection, OpenAPI
paths), plus a live boot serving `/api/v1/health`, `/docs`, `/docs-json` and
the public webhook route.

Not executed here: `prisma migrate deploy`, `prisma db seed` and the DB-backed
auth e2e suite, because Docker/PostgreSQL are unavailable on this machine.
Run steps 3–4 of the quick start on a machine with Docker to apply and
populate the database, then `TEST_DATABASE_URL="$DATABASE_URL" npm test`.

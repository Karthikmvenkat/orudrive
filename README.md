# SavariGo

A vehicle-rental product in one repository: a Next.js storefront with rider and staff
dashboards, an Expo app for riders, and a NestJS + Prisma API over PostgreSQL. It is a
build-to-spec clone of the Savaari flow — search a fleet, pick a vehicle and dates, get a
priced quote, book, pay, track — with the admin side that operates it.

```
.
├─ apps/web            # Next 15 App Router storefront, dashboards, BFF routes
├─ apps/api            # NestJS 11 API, Prisma 6, PostgreSQL 16
├─ apps/mobile         # Expo SDK 58 rider app — search, quote, reserve, track
├─ deploy/             # nginx template, certbot directories, production runbook
├─ docs/               # performance baseline, testing report
├─ docker-compose.yml  # the production stack (api + web + postgres + nginx)
└─ .github/workflows/  # ci.yml (proof) and deploy.yml (release)
```

## Get it running

Node 24 and a PostgreSQL 16 to write to. Any server works; `npm run db:embedded --workspace=api`
starts one from the package without a system install.

```bash
npm ci
cp apps/api/.env.example apps/api/.env          # then fill in the JWT secrets
cp apps/web/.env.example apps/web/.env.local

npm run db:generate --workspace=api
npm run db:deploy --workspace=api               # committed migrations, never `db push`
npm run db:seed --workspace=api                 # demo fleet, locations, logins

npm run dev:api                                 # API + Swagger, port from apps/api/.env
npm run dev:web                                 # storefront
npm run start:lan --workspace=mobile            # rider app: open the printed URL in Expo Go
```

The seed prints the demo accounts it created. It is fake data by design and nothing checks
`NODE_ENV` before writing it, so it belongs on a development or demo database and nowhere else.

## Verify it

| Command | Proves |
| --- | --- |
| `npm run test:api` | 144 Jest tests: 33 unit, 111 against a real PostgreSQL. The DB-backed files skip themselves unless `TEST_DATABASE_URL` is set. |
| `npm run test:e2e --workspace=web` | 65 Playwright assertions in six projects — public, customer, staff, partner, responsive, security — against the real API on 4100 and the site on 3001. |
| `npm run typecheck:api`, `npm run lint --workspace=web` | Types and lint. |
| `npm test --workspace=mobile` | 44 Jest specs over origin resolution, refresh-token rotation and the rental window. CI adds an `expo export` of both platforms. |
| `npm run perf:api` | API latency, concurrent throughput and query plans. |

Results and the honest list of gaps: [`docs/testing-report.md`](docs/testing-report.md).

## Ship it

[`deploy/README.md`](deploy/README.md) is the runbook. Two shapes, one per host: the whole
stack in Compose behind nginx on a single VPS, or the website on Vercel with the API still on a
box next to its database. `.github/workflows/deploy.yml` publishes images to GHCR and drives
either; `.github/workflows/ci.yml` is what has to be green first.

## Documentation

| Where | What is in it |
| --- | --- |
| [`apps/api/README.md`](apps/api/README.md) | Running the API, its scripts, environment variables, layout. |
| [`apps/api/docs/api.md`](apps/api/docs/api.md) | Endpoint reference with examples. |
| [`apps/api/docs/database.md`](apps/api/docs/database.md) | Schema conventions, migrations, backups. |
| [`apps/api/docs/erd.mmd`](apps/api/docs/erd.mmd) | Entity diagram for the schema, with the render command at the top of the file. |
| [`apps/api/docs/SavariGo.postman_collection.json`](apps/api/docs/SavariGo.postman_collection.json) | Importable request collection. |
| [`apps/web/README.md`](apps/web/README.md) | Storefront structure, BFF routes, environment variables, deploy. |
| [`apps/mobile/README.md`](apps/mobile/README.md) | Running the Expo app against a LAN API, route map, session model, and what it deliberately does not do yet. |
| [`docs/performance-baseline.md`](docs/performance-baseline.md) | Measured latency, throughput, bundle and page weight, with proposed production thresholds. |
| [`docs/testing-report.md`](docs/testing-report.md) | Every suite, its counts, coverage, and what remains unverified. |
| [`deploy/README.md`](deploy/README.md) | Production shapes, certificates, releases, pipelines, diagnostics. |

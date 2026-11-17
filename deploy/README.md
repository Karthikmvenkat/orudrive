# Deployment

Two production shapes are supported. Run one per host, not both: the API origin,
the CORS allow-list and the Razorpay webhook URL all depend on which one serves
the site.

| Shape | Where the website runs | Where the API runs | Use when |
| --- | --- | --- | --- |
| Single VPS | `web` container in the root `docker-compose.yml` | `api` container, same host | Default. One box, one origin, no per-request cross-origin hop. |
| Split | Vercel (Root Directory `apps/web`) | VPS or any Node host | The marketing site needs a CDN and preview deploys; the API stays on a box with the database. |

Environment variables are documented where they are read: every variable the API
actually consumes is in `apps/api/.env.example`, and the Compose file maps them one
by one so it is visible which secret reaches which container. Database conventions
and backup detail live in [`apps/api/docs/database.md`](../apps/api/docs/database.md). The
suites that gate a release, and the results they produced on 2026-11-16, are in
[`docs/testing-report.md`](../docs/testing-report.md).

## Pipelines

Two workflows, in `.github/workflows/`. Neither has executed yet: this checkout has
no commits and no remote, so both files are verified by parsing and by running their
shell steps against stubs, not by a green run.

`ci.yml` runs on pushes to `main`/`master`, on pull requests and by hand, in four
jobs:

| Job | What it proves |
| --- | --- |
| `api` | `tsc --noEmit` and the Jest unit + e2e specs against a PostgreSQL 16 service container, migrated with `migrate deploy` and seeded, so the GiST exclusion constraint and the fixture fleet are really there. |
| `web` | ESLint and `next build` with no API reachable. That is the container build's exact situation. |
| `e2e` | Playwright Chromium after both suites pass. `playwright.config.ts` starts `nest start` and `next dev` itself, so nothing is pre-served; the report and traces are uploaded as an artifact. |
| `images` | Both Dockerfiles compile, including the layer that resolves the Linux `sharp` binary the Windows lockfile cannot carry. Nothing is pushed. |

The performance scripts are not in CI: they measure one machine, and their numbers
would turn a shared runner red for reasons that have nothing to do with the code.
They run locally and land in [`docs/performance-baseline.md`](../docs/performance-baseline.md).

`deploy.yml` publishes. It runs on `v*` tags and by hand, and each half is gated on
the secrets that half needs, so committing the file before a host exists reports
"not configured" instead of failing:

| Target | Needs | What it does |
| --- | --- | --- |
| Images | `DEPLOY_*` secrets, `WEB_ORIGIN` variable | Builds both images on `linux/amd64`, tags them `<release>` (plus `latest` on a tag push) and pushes to GHCR under the lowercased repository owner. |
| VPS | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH` | SSHes to the host and runs pull → `run --rm migrate` → `up -d` → health check → `ps`, pinned to the new tag through `API_TAG`/`WEB_TAG`. |
| Vercel | `VERCEL_TOKEN` (+ `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) | `vercel deploy --non-interactive` from the repository root — the CLI must not be invoked from `apps/web`, because the workspace install needs the root lockfile. `--prod` is added only for tag pushes, so a manual run leaves a preview URL. |

Two details worth knowing before the first release:

- The release script never logs the host in to GHCR. Set both packages public, or run
  `docker login ghcr.io` on the host once. A private package with an expired token
  fails at `pull`, which is deliberately the step before any container is replaced.
- A manual run releases the commit it was started from, as `sha-<12 hex>`; a tag push
  releases that tag. Both jobs sit behind the `production` environment, so a required
  reviewer there is the only manual gate between CI and a live host.

## Single VPS

### Images

Both images build from the repository root (`.dockerignore` is the one that
keeps that context small) and each installs only its own workspace, so the
backend image carries no Next or Playwright and the website image carries no
Nest or Prisma.

One layer is worth knowing about before debugging a production page: the website
image reinstalls `sharp` for the container's platform. `sharp` is what Next's
`/_next/image` optimizer runs on, it is fetched as a platform-specific package,
and the committed lockfile — generated on Windows — records only
`@img/sharp-win32-x64`. The Dockerfile therefore installs the version the lockfile
names with `--no-save` and immediately `require`s it, so a platform that cannot
load sharp fails the build instead of serving 500s for every image on the site.

### Prerequisites

- Docker with the Compose v2 plugin, and a domain whose `A`/`AAAA` records already
  point at the host. Let's Encrypt cannot issue a certificate for a name that does
  not resolve.
- Ports 80 and 443 free and reachable from the internet.
- `.env.production` next to the root `docker-compose.yml`, copied from
  `.env.production.example`, with real secrets (`openssl rand -hex 32`).
- Both certificate directories, because Compose bind-mounts them read-only and a
  missing path makes nginx exit at start-up:

```bash
mkdir -p deploy/certbot/conf deploy/certbot/www
```

### First deploy

```bash
npm ci
cp .env.production.example .env.production          # fill in every value
npm run deploy:build
npm run deploy:migrate                              # prisma migrate deploy, one-shot
docker compose --env-file .env.production up -d postgres api web
```

For a demo or staging box only, the same dataset the development database uses can
be loaded into this one:

```bash
docker compose --env-file .env.production run --rm api npm run db:seed --workspace=api
```

Nothing in the seed script checks `NODE_ENV`, so it will create fake riders,
bookings and a working `admin@savarigo.com` login on whatever database it is
pointed at. It is listed here because reviewers and demos ask for it, not because
a host with real customers should ever run it.

nginx is deliberately started last, because its config references
`/etc/letsencrypt/live/$DOMAIN/fullchain.pem` and refuses to boot without it. Issue
the certificate with certbot's own temporary HTTP server while port 80 is still
free (`--standalone`, not `--webroot`: nothing is listening on 80 yet to answer the
challenge):

```bash
docker run --rm -p 80:80 \
  -v "$PWD/deploy/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --standalone -d "$DOMAIN" \
  --agree-tos -m "$ADMIN_EMAIL" --no-eff-email
```

Then bring the edge up and confirm the chain:

```bash
npm run deploy:up
curl -sS https://"$DOMAIN"/api/v1/health
curl -sSI https://"$DOMAIN"/ | head -5              # expect 200 + HSTS from Next
```

### Renewal

Certificates last 90 days. Once nginx is running it serves
`/.well-known/acme-challenge/` from `deploy/certbot/www`, so renewals use the
webroot authenticator and need no free ports. Run it twice a day from the host's
cron (`crontab -e`), adjusting the path to wherever this repository is checked out:

```cron
17 3,15 * * * cd /srv/savarigo && docker run --rm -v "$PWD/deploy/certbot/conf:/etc/letsencrypt" -v "$PWD/deploy/certbot/www:/var/www/certbot" certbot/certbot renew --webroot -w /var/www/certbot >> /var/log/savarigo-certbot.log 2>&1 && docker compose -f /srv/savarigo/docker-compose.yml --env-file /srv/savarigo/.env.production exec nginx nginx -s reload >> /var/log/savarigo-certbot.log 2>&1
```

`certbot renew` is a no-op when a certificate is not near expiry, so the reload runs
harmlessly on most nights. The `conf` mount is read-only inside nginx and writeable
for the certbot container on the host, which is why renewal runs on the host rather
than in a scheduled container.

### Routine releases

By hand, on the host. `deploy.yml`'s VPS job automates this same sequence and
replaces the build with a pull:

```bash
git pull
API_TAG="$(git rev-parse --short HEAD)" npm run deploy:build
npm run deploy:migrate      # before traffic restarts, never after
npm run deploy:up
```

Migrations run as a one-shot service so the API container never holds DDL rights.
Roll back by naming the previous tags — the images are immutable, and a schema the
old API can still read is the reason `migrate deploy` is only ever additive:

```bash
API_TAG=<previous> WEB_TAG=<previous> npm run deploy:up
```

### Diagnostics

Everything except nginx is published on `127.0.0.1` only:

```bash
npm run deploy:status
docker compose --env-file .env.production logs --tail=100 api
curl -sS http://127.0.0.1:4100/docs            # Swagger stays off the public origin
docker compose --env-file .env.production exec -T postgres \
  pg_dump -U savarigo_prod --format=custom savarigo > backup-$(date +%F).dump
```

## Split: website on Vercel

1. Import the repository, set **Root Directory** to `apps/web`. Vercel detects the
   workspace lockfile at the repository root, installs there and builds
   `apps/web` — `apps/web/vercel.json` only pins the Next framework and the Mumbai
   region, so the serverless functions sit next to the API instead of across an
   ocean from it.
2. Environment variables for the project:

   | Variable | Value | Notes |
   | --- | --- | --- |
   | `API_URL` | `https://api.example.com/api/v1` | Read by route handlers and SSR only. Never exposed to the browser. |
   | `COOKIE_SECURE` | `true` | The browser refuses to store a `Secure` cookie over http, so a mismatch makes login appear to succeed and then lose the session on the next request. |

   `NEXT_PUBLIC_API_URL` is not needed: no client component calls the API directly,
   all browser traffic goes through the same-origin BFF under `/api/*`.
3. Point the API at the new origin — `CORS_ORIGINS` must list the exact Vercel
   origin for anything that reaches the API from a browser, and Razorpay webhooks
   must be registered against the API origin
   (`/api/v1/payments/webhook`), because signature verification needs the raw
   request body and the BFF only forwards calls the browser starts.
4. Preview deployments need no extra configuration and no CORS entry: the visitor
   stays on the preview origin, and it is the Next server — not the browser — that
   calls the API with the token from the preview's own cookies. What previews do
   share is the production API and database, so a booking made while reviewing a
   preview deployment is a real booking.

The VPS side is unchanged except that `web` no longer needs to run:

```bash
npm run deploy:up                                   # api + postgres + nginx
docker compose --env-file .env.production stop web && docker compose --env-file .env.production rm -f web
```

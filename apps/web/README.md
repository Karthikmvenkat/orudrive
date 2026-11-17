# SavariGo Web

Customer storefront, checkout, customer dashboard and staff admin console for
SavariGo. Built with Next.js 15 (App Router), React 19 and Tailwind CSS v4.

The app is a **BFF (backend-for-frontend)** over the NestJS API in `apps/api`.
The browser only talks to same-origin `/api/*` route handlers; those handlers
hold the API tokens in httpOnly cookies and proxy requests to the API.

## Run locally

From the repository root:

```bash
npm install

# 1. Start PostgreSQL and the API (see apps/api/README.md)
npm run dev:api

# 2. Configure the web app
cp apps/web/.env.example apps/web/.env.local
# API_URL must point at the running API, including the /api/v1 suffix

# 3. Start Next.js
npm run dev:web        # http://localhost:3000
```

The local demo in this workspace runs the API on **4100** and Next.js on
**3001** to avoid the production server on 3000/3002:

```bash
cd apps/api && PORT=4100 npm run dev
cd apps/web && npx next dev -p 3001
```

Keep `PORT` (API) and `API_URL` (web) in sync. CORS only matters for direct API
calls; browser traffic goes through the BFF.

### Environment

| Variable | Purpose |
| --- | --- |
| `API_URL` | Server-side API base, e.g. `http://localhost:4100/api/v1` |
| `NEXT_PUBLIC_API_URL` | Only used if a client ever calls the API directly |
| `COOKIE_SECURE` | `true` behind HTTPS; `false` for local/LAN demos |

Never put API secrets in `NEXT_PUBLIC_*` variables. Payment card data is never
handled by this app; Razorpay Checkout is loaded directly from Razorpay.

## Deploy

Two supported shapes, both described in
[`deploy/README.md`](../../deploy/README.md):

- **Same VPS as the API** — `apps/web/Dockerfile` builds the Next server and the
  root `docker-compose.yml` runs it beside the API behind nginx. Because the
  browser only ever talks to this app's own `/api/*` handlers, one origin serves
  the site and its data and no CORS exception is needed.
- **Vercel** — import the repository with Root Directory `apps/web`;
  `apps/web/vercel.json` pins the framework and the region. Set `API_URL` to the
  deployed API origin and `COOKIE_SECURE=true`; no `NEXT_PUBLIC_*` variable is
  required.

`next build` does not need a running API. Pages that fetch from the API fall back
to the local fixtures when a call fails, and every such page is either dynamic
(`ƒ`, rendered per request) or revalidated within a minute, so no build bakes
placeholder inventory into the site permanently.

## Seeded accounts

Password for every seeded account: `SavariGo@2026`

| Role | Email | Entry point |
| --- | --- | --- |
| Customer | `karthik@email.com` | `/dashboard` |
| Vendor | `vendor@savarigo.com` | API only |
| Admin | `admin@savarigo.com` | `/admin` |

## Route map

Public site:

- `/` home, `/vehicles` all inventory, `/bikes-scooters`, `/cars`
- `/vehicles/[slug]` detail + booking widget
- `/checkout` quote, coupon, booking creation, Razorpay checkout
- `/booking/[code]/confirmed` confirmation

Customer dashboard (`CUSTOMER`):

- `/dashboard` overview, `/dashboard/bookings`, `/dashboard/bookings/[id]`
- `/dashboard/payments`, `/dashboard/profile`, `/dashboard/saved`

Admin console (`ADMIN`, `SUPPORT`):

- `/admin` overview: revenue, fleet, attention items, latest bookings
- `/admin/bookings` lifecycle, driver assignment, cancellation
- `/admin/payments` payment list and refunds (refunds are `ADMIN` only)
- `/admin/vehicles` inventory, status, pricing, retirement
- `/admin/categories`, `/admin/locations` catalogue and hubs
- `/admin/customers`, `/admin/drivers` verification actions
- `/admin/coupons`, `/admin/reviews` discounts and moderation
- `/admin/settings`, `/admin/audit` runtime config and audit trail

Mutations run through **server actions** in
`src/app/(admin)/admin/actions.ts`; after each action the page revalidates and
redirects with a notice or error banner.

## Auth model

- `middleware.ts` guards `/dashboard` and `/admin`; `/admin` requires an
  `ADMIN` or `SUPPORT` role decoded from the access token.
- Route handlers under `src/app/api/auth/*` implement login, registration,
  OTP, password reset, refresh and logout.
- `/api/proxy/[...path]` forwards whitelisted resources to the API with the
  access token, refreshing it once on `401`.
- `requireUser(roles, nextPath)` is used by server components for role checks.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (no package script yet) |

## Related docs

- API guide: [`../api/docs/api.md`](../api/docs/api.md)
- Database notes: [`../api/docs/database.md`](../api/docs/database.md)
- API README: [`../api/README.md`](../api/README.md)

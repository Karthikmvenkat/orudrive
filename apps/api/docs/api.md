# SavariGo API guide (Phase 3)

Base URL: `http://localhost:4000/api/v1`
Interactive docs: `http://localhost:4000/docs` (OpenAPI JSON at `/docs-json`)

All endpoints return JSON. Write endpoints reject unknown fields (`400
VALIDATION_ERROR`). Money values are INR numbers in responses; the database
stores them as `Decimal(12,2)`.

---

## 1. Authentication

### Token model

| Token | Lifetime | Storage on client | Notes |
| --- | --- | --- | --- |
| Access token | `JWT_ACCESS_TTL` (15m default) | memory | Send as `Authorization: Bearer <token>` |
| Refresh token | `JWT_REFRESH_TTL` (30d default) | httpOnly cookie or secure storage | Rotates on every `/auth/refresh` |

Refresh tokens are stored as SHA-256 hashes. Each rotation links the replacement
token to its predecessor; replaying a rotated token revokes the entire chain and
returns `401 REFRESH_TOKEN_REUSED`.

### Flow

```
register → verify-otp → login → (refresh | logout)
forgot-password → reset-password
```

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | – | Create a customer account and send an email OTP |
| `POST` | `/auth/verify-otp` | – | Activate the account with the 6-digit code |
| `POST` | `/auth/resend-otp` | – | Send a fresh code |
| `POST` | `/auth/login` | – | Email + password → token pair |
| `POST` | `/auth/refresh` | – | Rotate the refresh token |
| `POST` | `/auth/logout` | – | Revoke the supplied refresh token |
| `POST` | `/auth/forgot-password` | – | Email a password-reset code |
| `POST` | `/auth/reset-password` | – | Set a new password with the code |
| `POST` | `/auth/change-password` | Bearer | Change password; optionally revoke other sessions |

Development only: with `AUTH_DEBUG_OTP=true` and `NODE_ENV!=production`, OTP
responses include `verification.devCode`. Never enable this in production.

**Register**

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "rider@example.com",
  "password": "SavariGo@2026",
  "fullName": "Karthik R",
  "phone": "9876543210",
  "city": "Puducherry"
}
```

```json
201 Created
{
  "user": { "id": "…", "email": "rider@example.com", "status": "PENDING_VERIFICATION", "roles": ["CUSTOMER"] },
  "message": "Account created. Enter the 6-digit code sent to your email.",
  "verification": { "purpose": "EMAIL_VERIFICATION", "expiresInMinutes": 10 }
}
```

**Login**

```json
201 Created
{
  "user": { "id": "…", "email": "rider@example.com", "status": "ACTIVE", "roles": ["CUSTOMER"] },
  "tokens": {
    "accessToken": "eyJ…",
    "refreshToken": "v1.…",
    "expiresIn": 900,
    "refreshExpiresIn": 2592000
  }
}
```

---

## 2. Roles

| Role | Typical access |
| --- | --- |
| `CUSTOMER` | Own profile, bookings, payments, reviews, notifications |
| `DRIVER` | Driver profile, availability, assigned booking requests |
| `VENDOR` | Own vehicles, pricing, availability, bookings for owned vehicles |
| `SUPPORT` | Read-mostly staff access to bookings, payments, reviews, settings |
| `ADMIN` | Full access including refunds, roles, settings and deletions |

`@Roles()` is enforced by a global guard. A missing role returns
`403 FORBIDDEN`; a missing/invalid token returns `401 UNAUTHORIZED`.

---

## 3. Endpoint map

### Public catalogue

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | `200` with `status: ok \| degraded` |
| `GET` | `/vehicles` | `q`, `category` (slug), `location`, `minPrice`, `maxPrice`, `seats`, `transmission`, `fuelType`, `popular`, `sort` (`price_asc`, `price_desc`, `rating`, `newest`), `page`, `limit` |
| `GET` | `/vehicles/:idOrSlug` | Available vehicle details, gallery, active pricing |
| `GET` | `/vehicles/:vehicleId/availability?from&to` | Reserved ranges and `isAvailable` |
| `GET` | `/vehicles/:vehicleId/pricing` | Active price plans |
| `GET` | `/categories` | Categories with counts and starting price |
| `GET` | `/categories/:idOrSlug` | Category details |
| `GET` | `/locations` | Active pickup hubs |
| `GET` | `/locations/:idOrSlug` | Hub details |
| `GET` | `/coupons` | Currently valid coupon codes |
| `POST` | `/coupons/validate` | Preview discount for a vehicle/duration |
| `GET` | `/reviews/vehicle/:idOrSlug` | Published reviews plus rating distribution |
| `GET` | `/drivers` | Verified drivers (`available`, `language`, `q`) |
| `GET` | `/drivers/:id` | Public driver profile |

### Customer

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`/`PATCH` | `/users/me` | Account basics |
| `GET`/`PATCH` | `/customers/me` | Rider profile and licence |
| `POST` | `/bookings/quote` | Price a booking without reserving |
| `POST` | `/bookings` | Create booking and reserve the vehicle |
| `GET` | `/bookings/me` | My bookings (`status`, pagination) |
| `GET` | `/bookings/me/:idOrCode` | One booking |
| `POST` | `/bookings/:id/cancel` | Cancel and calculate refund |
| `POST` | `/payments/orders` | Razorpay order for a booking |
| `POST` | `/payments/verify` | Verify checkout signature |
| `GET` | `/payments` | My payment history |
| `POST` | `/reviews` | Review a completed booking |
| `GET` | `/reviews/me` | My reviews |
| `GET` | `/notifications` | My notifications (`unread`, `type`) |
| `GET` | `/notifications/unread-count` | Unread counter |
| `PATCH` | `/notifications/:id/read` | Mark one read |
| `PATCH` | `/notifications/read-all` | Mark all read |
| `DELETE` | `/notifications/:id` | Delete one |

### Driver

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/drivers/register` | Public driver application |
| `GET`/`PATCH` | `/drivers/me` | Own driver profile |
| `PATCH` | `/drivers/me/availability` | `{ "isAvailable": true }` (verified only) |
| `GET` | `/drivers/me/bookings` | Assigned / requested bookings |
| `POST` | `/drivers/me/bookings/:id/accept` | Accept a pending request |
| `POST` | `/drivers/me/bookings/:id/decline` | Release the request |

### Vendor / staff

| Method | Path | Roles |
| --- | --- | --- |
| `GET`/`POST` | `/vehicles/manage` | ADMIN, SUPPORT (list); ADMIN, VENDOR (create) |
| `GET`/`PATCH`/`DELETE` | `/vehicles/manage/:id`, `/vehicles/:id` | Owner vendor or ADMIN |
| `POST`/`PATCH`/`DELETE` | `/vehicles/:id/images`, `/vehicles/images/:imageId` | Owner vendor or ADMIN |
| `POST` | `/vehicles/:vehicleId/availability` | Owner vendor or ADMIN |
| `DELETE` | `/availability/:id` | Owner vendor or ADMIN |
| `GET`/`POST`/`PATCH`/`DELETE` | `/pricing`, `/pricing/:id`, `/pricing/vehicle/:vehicleId` | Owner vendor or ADMIN |
| `GET` | `/bookings/manage` | ADMIN, SUPPORT |
| `GET` | `/bookings/manage/:id` | ADMIN, SUPPORT, owner VENDOR |
| `PATCH` | `/bookings/:id/status` | ADMIN, SUPPORT, owner VENDOR |
| `PATCH` | `/bookings/:id/driver` | ADMIN, SUPPORT |
| `GET`/`PATCH`/`DELETE` | `/categories`, `/locations` | ADMIN (SUPPORT may read `/manage`) |
| `GET`/`POST`/`PATCH`/`DELETE` | `/coupons`, `/coupons/manage` | ADMIN (SUPPORT read) |
| `GET` | `/payments/manage` | ADMIN, SUPPORT |
| `POST` | `/payments/:id/refund` | ADMIN |
| `GET`/`PATCH`/`DELETE` | `/reviews/manage`, `/reviews/:id` | ADMIN, SUPPORT (delete ADMIN) |
| `GET`/`POST` | `/notifications/manage`, `/notifications` | ADMIN, SUPPORT |
| `POST` | `/notifications/broadcast` | ADMIN |
| `GET` | `/admin/overview`, `/admin/audit-logs`, `/admin/settings`, `/admin/roles` | ADMIN (SUPPORT read) |
| `PUT` | `/admin/settings/:key` | ADMIN |
| `GET`/`PATCH`/`DELETE` | `/users`, `/users/:id`, `/users/:id/status`, `/users/:id/roles` | ADMIN (SUPPORT read) |
| `GET`/`PATCH` | `/customers`, `/customers/:id` | ADMIN, SUPPORT |
| `GET`/`PATCH` | `/drivers/manage`, `/drivers/:id/verification` | ADMIN, SUPPORT |

---

## 4. Booking and pricing

`POST /bookings/quote` and `POST /bookings` accept the same body:

```json
{
  "vehicleId": "00000000-0000-0000-0000-000000000000",
  "pickupLocationId": "00000000-0000-0000-0000-000000000000",
  "dropLocationId": null,
  "pickupAt": "2026-12-01T09:00:00+05:30",
  "returnAt": "2026-12-04T09:00:00+05:30",
  "couponCode": "SAVARI100",
  "addOns": ["HELMET", "DELIVERY", "INSURANCE"],
  "driverId": null,
  "requestDriver": false,
  "specialRequests": "Deliver to White Town"
}
```

Rules:

- Pickup cannot be in the past; return must be after pickup; maximum 90 days.
- Rental days are rounded up from 24-hour blocks.
- The active price plan is selected from `validFrom`/`validTo` at pickup time.
- Weekly (≥7 days) or monthly (≥30 days) discount is applied to the rental.
- Add-ons: helmet ₹49/day, delivery ₹199 flat, damage cover ₹99/day, driver at
  the driver's daily rate.
- Coupons are validated server-side (window, minimum order, category, global
  and per-user limits) and consumed inside the booking transaction.
- `BOOKING_TAX_PERCENT` defaults to `0` so the current web totals stay the same;
  set `18` in production if GST should apply.
- The booking transaction writes a `BOOKED` availability row. PostgreSQL's GiST
  exclusion constraint is the final concurrency guard; a conflict returns
  `409 BOOKING_CONFLICT`.

Quote response (abridged):

```json
{
  "durationDays": 3,
  "pricing": {
    "baseDayRate": 1500,
    "grossRentalAmount": 4500,
    "durationDiscount": 0,
    "rentalAmount": 4500,
    "extrasAmount": 199,
    "subtotal": 4699,
    "coupon": { "code": "SAVARI100", "discount": 100 },
    "discountAmount": 100,
    "taxPercent": 0,
    "taxAmount": 0,
    "depositAmount": 2000,
    "totalAmount": 6599,
    "currency": "INR"
  },
  "items": [
    { "kind": "VEHICLE_RENTAL", "label": "Vehicle rental · 3 days", "quantity": 3, "unitAmount": 1500, "totalAmount": 4500 },
    { "kind": "DELIVERY", "label": "Doorstep delivery & pickup", "quantity": 1, "unitAmount": 199, "totalAmount": 199 }
  ]
}
```

### Status lifecycle

```
PENDING → CONFIRMED → ONGOING → COMPLETED
        ↘ CANCELLED        ↘ NO_SHOW
```

`PATCH /bookings/:id/status` accepts `CONFIRMED`, `ONGOING`, `COMPLETED` and
`NO_SHOW`; invalid transitions return `400 INVALID_BOOKING_STATUS`. Cancellation
must use `POST /bookings/:id/cancel` so refunds are computed.

### Cancellation policy

| Time before pickup | Rental refund |
| --- | --- |
| More than 24 hours | 100% |
| 6–24 hours | 50% |
| Under 6 hours | First rental day non-refundable |

The security deposit is always refundable. Add-ons are non-refundable. The
response includes the full breakdown plus the gateway refund status
(`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` or `NOT_DUE`).

---

## 5. Payments (Razorpay)

Razorpay keys are server-side only (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
Card numbers, expiry, CVV and tokens never reach SavariGo.

### Checkout flow

1. `POST /payments/orders` with `{ "bookingId": "…", "idempotencyKey": "…" }`.
   The response returns `keyId`, `amountPaise`, `order.id` and `paymentId`.
2. Open Razorpay Checkout in the browser with that order.
3. `POST /payments/verify` with `razorpayOrderId`, `razorpayPaymentId` and
   `razorpaySignature`. The server recomputes the HMAC, fetches the payment
   from Razorpay and confirms the captured amount before marking the booking
   paid. With a driver assigned the booking stays `PENDING` until the driver
   accepts; otherwise it becomes `CONFIRMED`.
4. Razorpay webhooks (`POST /payments/webhook`) are verified against the raw
   request body using `RAZORPAY_WEBHOOK_SECRET`. Configure events:
   `payment.captured`, `payment.authorized`, `payment.failed`,
   `refund.created`, `refund.processed`, `refund.failed`.

When keys are absent the order endpoint returns
`503 PAYMENT_PROVIDER_NOT_CONFIGURED`; no payment is faked.

### Refunds

`POST /payments/:id/refund` (ADMIN) accepts an optional `amount` and `reason`.
Automatic refunds are created when a paid booking is cancelled. If the gateway
is configured the refund is sent immediately; otherwise a `PENDING` refund row
is recorded for manual processing. Payment status becomes `PARTIALLY_REFUNDED`
or `REFUNDED` only after the gateway reports the refund as completed.

### Idempotency

`providerOrderId`, `providerPaymentId` and `idempotencyKey` are unique.
Repeating `POST /payments/orders` for the same booking returns the existing
pending order instead of creating a second one.

---

## 6. Reviews

A review is allowed once per booking and only after `COMPLETED`. Publishing,
hiding, editing or deleting a review recalculates `vehicles.rating` and
`vehicles.reviewCount` from published rows.

```json
POST /api/v1/reviews
{
  "bookingId": "…",
  "rating": 5,
  "title": "Perfect scooter for Puducherry",
  "comment": "Clean, delivered on time and the helmet was included."
}
```

---

## 7. Notifications

`notify` writes an in-app notification for booking/payment/refund events. Email
delivery uses the configured SMTP server; if SMTP is disabled the row is stored
with `FAILED` status rather than pretending it was sent. Admins can send to one
user (`POST /notifications`) or broadcast to a role / list of users
(`POST /notifications/broadcast`, max 500 recipients).

---

## 8. Admin and audit

- `GET /admin/overview` — user/vehicle/booking counts, collected revenue minus
  completed refunds, six-month revenue/bookings series, attention counters and
  recent bookings.
- `GET /admin/audit-logs` — authenticated mutations recorded by the global
  interceptor (method + path, entity, actor, IP, user agent). Request bodies are
  never logged.
- `GET /admin/settings` / `PUT /admin/settings/:key` — JSON runtime settings.
- `GET /admin/roles` — roles, permissions and user counts.

Audit writes are best-effort and never break the request that triggered them.

---

## 9. Errors

Every error uses one envelope:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "BOOKING_CONFLICT",
  "message": "The selected vehicle is already reserved for part of that period",
  "details": { "startsAt": "…", "endsAt": "…" },
  "path": "/api/v1/bookings",
  "method": "POST",
  "timestamp": "2026-11-09T09:00:00.000Z",
  "requestId": "8a4f…"
}
```

| HTTP | Common codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_DATE_RANGE`, `COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER`, `COUPON_LIMIT_REACHED`, `COUPON_USER_LIMIT`, `BOOKING_TOO_LONG`, `MIN_RENTAL_DAYS`, `INVALID_BOOKING_STATUS`, `PAYMENT_SIGNATURE_INVALID`, `WEBHOOK_SIGNATURE_INVALID` |
| 401 | `UNAUTHORIZED`, `INVALID_TOKEN`, `REFRESH_TOKEN_REUSED` |
| 403 | `FORBIDDEN`, `BOOKING_FORBIDDEN`, `DRIVER_NOT_VERIFIED` |
| 404 | `BOOKING_NOT_FOUND`, `VEHICLE_NOT_FOUND`, `PAYMENT_NOT_FOUND`, `REVIEW_NOT_FOUND`, `NOTIFICATION_NOT_FOUND` |
| 409 | `BOOKING_CONFLICT`, `BOOKING_ALREADY_PAID`, `EMAIL_TAKEN`, `PHONE_TAKEN`, `REVIEW_EXISTS`, `DUPLICATE_RECORD`, `AVAILABILITY_OVERLAP` |
| 429 | `RATE_LIMITED` |
| 502 | `PAYMENT_GATEWAY_ERROR`, `PAYMENT_GATEWAY_UNREACHABLE` |
| 503 | `PAYMENT_PROVIDER_NOT_CONFIGURED`, `WEBHOOK_NOT_CONFIGURED` |

Prisma errors are mapped centrally: `P2002` → 409, `P2025` → 404, `P2003` /
`P2014` → 409, PostgreSQL `23P01` (exclusion constraint) → 409
`BOOKING_CONFLICT`.

---

## 10. Rate limiting, CORS and headers

- Global limit: 120 requests/minute per IP. Auth endpoints are tighter (5–10
  per minute), quote 60/minute, booking create 20/minute, payment order
  20/minute, webhook 300/minute.
- CORS allows the origins in `CORS_ORIGINS` (default ports 3000 and 3001) with
  credentials.
- `helmet` sets standard security headers.
- Every response carries `x-request-id`; send your own header to correlate logs.

---

## 11. Postman collection

Import `docs/SavariGo.postman_collection.json`. It defines `baseUrl`,
`accessToken`, `refreshToken`, `vehicleId`, `pickupLocationId`, `bookingId` and
`couponCode` collection variables and stores tokens automatically after login
and refresh.

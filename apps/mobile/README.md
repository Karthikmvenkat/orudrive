# SavariGo Mobile

The rider app: search the fleet, pick a vehicle and a rental window, get a priced
quote, reserve, and follow the trip. Expo SDK 58 / React Native 0.88 with
TypeScript in strict mode and `expo-router` file routes; Android and iOS ship
from one codebase through EAS.

It is a second client for the same API the website uses, not a second backend.
Every figure on screen — the quote, the deposit, the coupon saving, the
availability of a vehicle — is the API's answer, never a local estimate.

```
.
├─ src/app              # routes: (tabs), (auth), vehicles, checkout, booking, …
├─ src/features         # search window, quote, bookings list — hooks + cards
├─ src/components       # ui.tsx primitives, themed text/view
├─ src/lib/api          # client, typed contracts, error copy, origin resolution
├─ src/lib/session      # SecureStore persistence, refresh rotation, context
└─ src/constants/theme  # the same design tokens the website renders from
```

## Run locally

Node 24, a phone or simulator on the same Wi-Fi as this machine, and the API
running. Nothing in `dependencies` needs a custom native build, so **Expo Go is
enough** — no development client today.

```bash
# 1. PostgreSQL + API, as usual (see apps/api/README.md)
npm run dev:api                      # listens on the PORT in apps/api/.env (4100)

# 2. Configure the app
cp apps/mobile/.env.example apps/mobile/.env.local     # defaults are correct for LAN dev

# 3. Start the bundler and open the URL it prints from Expo Go
npm run start:lan --workspace=mobile
```

Then, from the Expo Go app, open the `exp://192.168.x.x:8081` link. Sign in with
one of the accounts `npm run db:seed --workspace=api` prints; the fleet and the
photographs are the seeded ones, so the app shows exactly what the website shows.

Native scripts, when you want a real binary instead of Expo Go:

```bash
npm run android --workspace=mobile   # attached device or running simulator
npm run ios --workspace=mobile       # macOS + Xcode only
```

### Environment

`apps/mobile/.env.example` documents every variable. The short version: unset
both origins for development and let the app derive them from the Expo dev server
address, because that survives a DHCP lease changing.

| Variable | Unset behaviour |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `http://<hostUri host>:EXPO_PUBLIC_DEV_API_PORT/api/v1` |
| `EXPO_PUBLIC_MEDIA_URL` | `http://<hostUri host>:EXPO_PUBLIC_DEV_WEB_PORT` |
| `EXPO_PUBLIC_DEV_API_PORT` | `4100` |
| `EXPO_PUBLIC_DEV_WEB_PORT` | `3001` |

Two details worth knowing before debugging a connection:

- **Images come from the website.** The catalogue stores `/images/vehicles/…`
  paths that only the Next.js origin can serve, so a build that can reach the API
  but not the web origin shows placeholders.
- **An Android emulator is not on the LAN.** `localhost` in the dev server URL is
  rewritten to `10.0.2.2`, the emulator's documented alias for the host machine.
  On a physical device the LAN address is used as it is.
- **CORS is a web-target concern only.** Native `fetch` sends no `Origin` header,
  so the API's `CORS_ORIGINS` list is irrelevant to the app. If you run
  `npm run web --workspace=mobile`, add the Expo dev server origin
  (`http://localhost:8081`) to `CORS_ORIGINS` in `apps/api/.env`.

## Route map

| Route | Screen | Needs sign-in |
| --- | --- | --- |
| `/(tabs)/index` | Search: rental window, category, sort, live fleet | no |
| `/vehicles/[slug]` | Vehicle, price ladder, availability for the window, reviews | no |
| `/checkout/[vehicleId]` | Locations, extras, driver request, coupon, server quote, reserve | yes |
| `/booking/[code]` | One booking: status, amounts, payments, cancel | yes |
| `/(tabs)/bookings` | Trips, filterable by status, paged | yes |
| `/(tabs)/profile` | Contact details, verification, links to the below | yes |
| `/notifications` | In-app inbox, mark read, unread badge | yes |
| `/change-password` | Password change, optionally out other sessions | yes |
| `/(auth)/login` · `register` · `verify` · `forgot-password` | Auth flow, `?next=` returns the rider where they were | no |

`/checkout` needs an account to reserve, so tapping the button while signed out
hands over to `/(auth)/login?next=/checkout/<id>` and the rider lands back on the
same half-filled form. The login screen only honours a `next` that starts with
`/`, so a shared link cannot steer a sign-in anywhere else.

## Session model

`POST /auth/login` returns an access/refresh pair in the body — there is no
cookie jar on a phone. Both go to Keychain/Keystore through `expo-secure-store`;
never to `AsyncStorage`, and never to `localStorage` on the web target, where the
session stays in memory for the length of the page.

A `401` on any authenticated call triggers one refresh, and only one: the API
rotates the refresh token on use and rejects a replay, so two concurrent
failures share a single in-flight refresh and both replay against the new pair.
If the refresh itself is refused the session is cleared and the rider is signed
out, which is what the API intends by rotating.

The rental window — day, half-hour slot, duration — lives in app-level context
(`src/features/search/window-context.tsx`) so search, detail, checkout and the
quote all price the same hours. Quotes are requested from the server and
debounced by 350 ms, because `POST /bookings/quote` is throttled at 60/min and a
day stepper dragged across a week would otherwise spend the whole budget.

## Not built here, on purpose

| Gap | Why, and what it would take |
| --- | --- |
| Card/UPI payment inside the app | Razorpay Checkout is a browser SDK and no native SDK is installed, so a mobile booking is **reserved** with `paymentStatus: PENDING` and settled on the website or at the counter. The app reads `/payments` and writes nothing. Adding `razorpay-react-native` means a native module, which means a development client build instead of Expo Go plus a signing identity — a decision, not a dependency bump. |
| Remote push notifications | `expo-notifications` is installed and registered in `app.json`, but the API has no device-token table and no push sender, so there is nothing to register a token with. The inbox at `/notifications` is the delivery mechanism today, read on focus. Real push needs a `PushToken` model, a sender (Expo Push or FCM/APNs directly) and a trigger in the booking lifecycle. |
| Driver, vendor and admin screens | Staff tooling stays on the web dashboard, which already has it. |
| On-device UI tests | CI proves types, lint, unit specs and a real Metro bundle for both platforms. It does not tap through screens — Detox or Maestro both need a device or emulator image, which is a separate call about runner cost. |

## Scripts

| Command | Does |
| --- | --- |
| `npm start --workspace=mobile` | Bundler on the machine's usual address. |
| `npm run start:lan --workspace=mobile` | Bundler forced onto the LAN address — what a phone needs. |
| `npm run typecheck --workspace=mobile` | `tsc --noEmit` over the app and its specs. |
| `npm run lint --workspace=mobile` | `expo lint` (ESLint 9 flat config, `eslint-config-expo`). |
| `npm test --workspace=mobile` | Jest with `jest-expo`: origins, the client's refresh rotation, session storage, the rental window. |
| `npm run export:android --workspace=mobile` | Hermes bundle for Android into `dist/`. Proves every route resolves. |
| `npm run export:ios --workspace=mobile` | The same for iOS. |
| `npm run prebuild --workspace=mobile` | Generate `android/` and `ios/` for a custom native build. |
| `npm run build:android:preview --workspace=mobile` | EAS cloud build. Needs `eas login` and the `projectId` filled in `app.json`. |

`eas.json` carries three profiles — `development` (Expo Go-style dev client, APK
and iOS simulator), `preview` (internal APK/ipa) and `production` — with
`EXPO_PUBLIC_API_URL` set per profile, because a cloud build has no dev server to
derive an origin from. Fill the `REPLACE_WITH_*` hosts and
`extra.eas.projectId` before the first build.

## CI

`.github/workflows/ci.yml` runs the `mobile` job on every push and pull request:
typecheck, lint, Jest, then `expo export --platform android` and
`--platform ios`. The export is the stand-in for a device build — it runs the
same Metro bundler over every route and fails on an unresolvable import, without
needing an EAS login, a simulator or a signing certificate.

## Related docs

- [`apps/api/README.md`](../api/README.md) — the API this app talks to, its scripts and environment.
- [`apps/api/docs/api.md`](../api/docs/api.md) — endpoint reference with examples.
- [`apps/web/README.md`](../web/README.md) — the storefront that shares these tokens and types.
- [`docs/testing-report.md`](../../docs/testing-report.md) — every suite in the repository and what remains unverified.

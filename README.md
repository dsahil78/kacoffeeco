# Kick Ass Coffee Co.

A working prototype of a premium ground-coffee subscription: one product, one plan,
**The Monthly Kick at $49.00/month**, sold through guest checkout with
[Hyperswitch](https://hyperswitch.io) Unified Checkout on the sandbox.

**Landing → Checkout → Payment → Confirmation.**

- **Frontend** — React + Vite
- **Backend** — Node + Express, deployed as a single Vercel serverless function under `/api`
- **Database** — Supabase (Postgres)
- **Payments** — Hyperswitch Unified Checkout, sandbox

> **Scope note.** This takes a **single one-off $49 charge**. There is deliberately no
> recurring billing, no mandate, no card tokenization and no billing scheduler — the UI
> talks about a monthly subscription, but only one payment is actually taken.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill it in — see "Environment" below
npm run dev               # Express on :3001, Vite on :5173
```

Open <http://localhost:5173>.

`npm run dev` runs both processes; Vite proxies `/api` to Express, so the browser only
ever talks to one origin — exactly as it will on Vercel.

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web together |
| `npm run dev:api` / `npm run dev:web` | Either half on its own |
| `npm run build` | Production bundle into `dist/` |
| `npm test` | Signature-verification tests (no network, no keys needed) |
| `npm run lint` | oxlint |

Check the server is wired up: `curl localhost:3001/api/health` → `{"ok":true,"missing_env":[]}`.

---

## Environment

Copy `.env.example` to `.env` (or `.env.local` — both are read, and `.env.local` wins, the
same precedence Vite uses). The split matters: **Vite only inlines variables prefixed
`VITE_`**, and that prefix is the boundary keeping secrets out of the bundle.

### Server-only

| Variable | Where to find it |
| --- | --- |
| `HYPERSWITCH_SECRET_KEY` | Dashboard → Developers → API Keys (`snd_…`) |
| `HYPERSWITCH_PROFILE_ID` | Dashboard → Settings → Business Profile (`pro_…`, optional) |
| `HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY` | Same business profile — signs redirects *and* webhooks |
| `HYPERSWITCH_BASE_URL` | `https://sandbox.hyperswitch.io` |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Bypasses RLS — never ship it to a browser |
| `APP_BASE_URL` | Public origin, used to build `return_url` |

### Client (public)

| Variable | Notes |
| --- | --- |
| `VITE_HYPERSWITCH_PUBLISHABLE_KEY` | `pk_snd_…`. The SDK picks sandbox from this prefix |
| `VITE_API_BASE_URL` | Leave empty for same-origin `/api` |

`HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY` must come from the **same business profile** as
`HYPERSWITCH_PROFILE_ID`. A key from a different profile produces valid-looking payments
whose signatures never verify.

---

## Database

Run `supabase/migrations/0001_init.sql` — `supabase db push`, or paste it into the SQL
editor.

| Table | Holds |
| --- | --- |
| `customers` | One row per guest email + their Hyperswitch customer id |
| `orders` | One row per checkout attempt: `amount_cents`, `hyperswitch_payment_id`, `status` |
| `webhook_events` | Delivery ledger, unique on `event_id`, for idempotency |

RLS is **on with no policies**, so the anon key can read and write nothing. Every write
goes through Express with the service-role key, which bypasses RLS.

---

## Payment flow

1. **Checkout** posts email + shipping to `POST /api/payments`.
2. **Server** finds-or-creates the customer (in Supabase and Hyperswitch), inserts an
   order, then creates the payment: `amount: 4900`, `currency: "USD"`, automatic capture,
   `confirm: false`, `metadata.order_id`, and a `return_url` back to `/confirmation`.
   It returns **only** `client_secret`, `payment_id` and `order_id`.
3. **Payment page** loads Unified Checkout with the publishable key + `client_secret`,
   mounts the widget, and confirms with `redirect: "always"`.
   Card data goes straight from the SDK's iframes to Hyperswitch — it never reaches our
   origin, so we carry **no PCI scope**.
4. **Redirect** returns with `status`, `payment_id`, `payment_intent_client_secret`,
   `amount`, `manual_retry_allowed`, `signature` and `signature_algorithm`. The server
   verifies the HMAC-SHA512 signature before trusting any of it. It is a **UX signal
   only**.
5. **Webhook** at `POST /api/webhooks/hyperswitch` is the **source of truth**. It verifies
   `x-webhook-signature-512`, records the event, and advances the order status. The
   Confirmation page reads status from our database, never from the URL.

### Signature verification

Both signatures use `payment_response_hash_key`, and both are implemented in
[`server/lib/verifySignature.js`](server/lib/verifySignature.js) against the router's
behaviour rather than prose docs:

- **Webhooks** — HMAC-SHA512 over the **exact raw request bytes**. This is why the webhook
  route uses `express.raw` instead of `express.json`: parsing and re-serialising would
  reorder keys and change the digest.
- **Redirects** — every query param present *before* `signature`/`signature_algorithm` are
  appended, taken percent-decoded, sorted, joined as `key=value` with `&`, then HMAC-SHA512
  and hex-encoded. (`make_url_with_signature` → `hmac_sha512_sorted_query_params`.)

**Not every redirect is signed**, even with `enable_payment_response_hash` on. When a
payment completes without a connector round-trip (a plain non-3DS card), the *SDK* builds
the return URL in the browser and appends only `status`, `payment_id` and
`payment_intent_client_secret` — no signature. When the payment does redirect through a
connector (3DS, bank redirect), the *router* builds it and you additionally get `amount`,
`manual_retry_allowed`, `signature` and `signature_algorithm`. Verified on the sandbox with
both `4242…4242` (unsigned) and `4000003800000446` (signed, verified `true`). The
Confirmation page treats a missing signature as "no redirect evidence" and falls back to
the database, which is authoritative either way.

`npm test` covers both, including tampering, forged and malformed signatures. It needs no
keys or network.

### Order status is a ratchet

Webhook deliveries are not ordered, so status only ever moves **up**
`created → processing → failed → succeeded`. `failed → succeeded` is deliberately
reachable (Hyperswitch permits a retry on the same intent); `succeeded → failed` is not.
The guard is re-checked in the SQL `WHERE` clause so concurrent deliveries cannot clobber
each other.

### About the reconcile fallback

The spec makes the webhook the source of truth, and it is. But a webhook cannot reach
`http://localhost:5173`, so the order-status endpoints also re-read the payment from
Hyperswitch (`GET /payments/{id}?force_sync=true`) when an order is **non-terminal**, and
fold the result in through the same ratchet. Without it the Confirmation page would sit on
"processing" forever in local development. It is also a real safety net for a dropped
delivery in production. The database stays authoritative either way.

---

## Testing a payment

Use the [Hyperswitch sandbox test cards](https://docs.hyperswitch.io/). On the dummy
connector, any future expiry and any 3-digit CVC:

| Outcome | Card |
| --- | --- |
| Success | `4242 4242 4242 4242` |
| Success | `4111 1111 1111 1111` |
| Declined | `4000 0000 0000 0002` |
| Insufficient funds | `4000 0000 0000 9995` |
| 3DS challenge | `4000 0038 0000 0446` |

Payments are created with `authentication_type: "three_ds"` (Hyperswitch's default), so
some cards route through a challenge page. Either way `redirect: "always"` brings the
shopper back through `return_url`, so Confirmation behaves the same.

### Webhooks locally

Point a tunnel at the Express port and register it in the Hyperswitch dashboard
(Settings → Webhooks):

```bash
npx localtunnel --port 3001     # or: ngrok http 3001
# webhook URL: https://<your-tunnel>/api/webhooks/hyperswitch
```

Without a tunnel the flow still completes — the reconcile fallback covers it — but you
will not exercise the webhook path.

---

## Deploying to Vercel

1. Import the repo. The Vite preset in `vercel.json` is picked up automatically.
2. Add every variable from `.env.example` in **Settings → Environment Variables**. Set
   `APP_BASE_URL` to the real deployment URL.
3. Deploy, then register the webhook at
   `https://<your-app>.vercel.app/api/webhooks/hyperswitch`.

`vercel.json` sends `/api/*` to the function and everything else to the SPA. The Express
app mounts its routes under `/api` because Vercel forwards the original path.

The function is stateless by construction — no sessions, no in-memory caches, no
connection pool. Supabase is reached over PostgREST, so every invocation stands alone.

---

## Project structure

```
api/index.js              Vercel serverless entrypoint (exports the Express app)
server/
  app.js                  Express app, shared by dev + serverless
  dev.js                  Local API server on :3001
  config.js               Env + the single plan definition
  routes/payments.js      create-payment, order status, redirect verification
  routes/webhooks.js      Hyperswitch webhook receiver
  services/hyperswitch.js REST calls with the secret key
  services/supabase.js    Service-role client
  lib/verifySignature.js  Webhook + redirect HMAC verification
  lib/orders.js           Status ratchet, reconcile, browser-safe serialisation
src/
  pages/                  Landing, Checkout, Payment, Confirmation
  components/             Nav, Footer, CremaSeal, HeroVisual, TrustStrip, FlowLayout
  lib/                    api client, Unified Checkout wiring, plan, session handoff
  styles/                 theme.css (tokens), landing.css, flow.css
supabase/migrations/      Schema as SQL
```

---

## Design

Warm and cream-forward: cream page, espresso text, a molten-crema gold gradient for
primary actions, oxblood for depth. Fraunces for display (italic accents in crema gold),
Inter for UI. Pill buttons, generous radii, a film-grain overlay, micro-motion that
respects `prefers-reduced-motion`, and a visible focus ring on everything focusable.

Tokens live in [`src/styles/theme.css`](src/styles/theme.css). Every route was
render-checked at 1440px and 390px with no horizontal overflow.

The hero cup is an SVG illustration standing in for product photography. It is isolated in
`HeroVisual.jsx` behind the `.cup-svg` class — swap that one element for an `<img>` and the
disc, glow, seal, chip and beans keep their positions.

The Unified Checkout widget renders in a cross-origin iframe, so site CSS cannot reach it.
It is themed separately through the `appearance` object in
[`src/lib/hyperswitch.js`](src/lib/hyperswitch.js), mirroring the same tokens.

### Why not `@juspay-tech/react-hyper-js`?

The React wrapper is published with `main` pointing at a UMD bundle that exports a single
`ReactHyperJs` namespace object — the named exports (`HyperElements`, `UnifiedCheckout`,
`useHyper`) only exist in `dist/index.mjs`, which no `exports`/`module` field points at,
and which inlines its own copy of React. Bundling a second React is a fast route to
"Invalid hook call". So the Payment page uses the imperative API from
`@juspay-tech/hyper-js` instead — `loadHyper` → `hyper.widgets({ clientSecret })` →
`widgets.create('payment')` → `.mount()` → `hyper.confirmPayment()` — mounted into a plain
`<div>`. Same SDK, no packaging hazard.

---

## Security notes

- `HYPERSWITCH_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are read only in `server/`, are
  never imported from `src/`, and never appear in a response body.
- API errors return an allowlisted `publicMessage` or a generic string; provider errors and
  stack traces stay in the logs.
- Order responses carry a masked email (`s•••l@icloud.com`) rather than the address on file.
- No raw card data is collected, transmitted or stored anywhere in this codebase.
- `.env` is gitignored. `.env.example` holds placeholders only.

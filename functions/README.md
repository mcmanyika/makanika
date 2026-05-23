# Makanika Cloud Functions

Server-side Stripe integration. **Never expose `STRIPE_SECRET_KEY` on the frontend.**

## Functions

| Function | Type | Description |
|----------|------|-------------|
| `createStripeCheckoutSession` | Callable | Customer portal — Stripe Checkout URL |
| `createStripePaymentLink` | Callable | Admin — shareable payment link |
| `stripeWebhook` | HTTP | Updates `invoices` and `payments` on successful payment |

## Setup

```bash
cd functions
npm install
```

Set secrets (Firebase Functions v2 / env):

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

Create `functions/.env` from `functions/.env.example` (gitignored):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
```

> **Note:** `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` in the Next.js `.env.local` do **not** reach Cloud Functions. Stripe `success_url` / `cancel_url` use **`APP_URL`** in `functions/.env` or your deployed function environment.

## Local development (no Blaze plan required)

1. Copy Stripe keys into `functions/.env` (see `functions/.env.example`).
2. In root `.env.local`, set:
   ```
   NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR=true
   ```
3. Start the emulator (terminal 1):
   ```bash
   cd functions && npm run serve
   ```
4. Start Next.js (terminal 2):
   ```bash
   npm run dev
   ```

Payments will call `createStripeCheckoutSession` on `localhost:5001`.

## Deploy (requires Firebase Blaze plan)

Upgrade at [Firebase usage](https://console.firebase.google.com/project/makanika-76c10/usage/details), then:

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

**Production `APP_URL` (required for correct Stripe redirects):**

Set on deployed functions (Firebase Console → Functions → environment variables, or `functions/.env` before deploy):

```
APP_URL=https://makanika-oqw5.vercel.app
```

Without this, customers return to `http://localhost:3000` after paying.

Also set in Vercel: `NEXT_PUBLIC_APP_URL=https://makanika-oqw5.vercel.app`

Set `NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR=false` in production.

## Stripe webhook

Point Stripe webhook to:

```
https://<region>-<project>.cloudfunctions.net/stripeWebhook
```

Events: `checkout.session.completed`, `payment_intent.succeeded`

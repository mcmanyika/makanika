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

Create `functions/.env` (gitignored) — copy keys from your root `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
```

> **Note:** `STRIPE_SECRET_KEY` in the Next.js `.env.local` does **not** reach Cloud Functions. It must be in `functions/.env` or Firebase secrets.

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

Set `NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR=false` in production.

## Stripe webhook

Point Stripe webhook to:

```
https://<region>-<project>.cloudfunctions.net/stripeWebhook
```

Events: `checkout.session.completed`, `payment_intent.succeeded`

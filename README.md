# Makanika

Auto repair shop customer management SaaS for the American market. Built with Next.js, Tailwind CSS, Firebase, and Stripe.

## Features

- **Shop dashboard** — revenue stats, repair orders, customers, vehicles, invoices, appointments, messaging
- **Customer portal** — track repairs, approve estimates, pay invoices, book appointments
- **Role-based auth** — shop admin, mechanic, customer (Firebase Auth)
- **Stripe** — Checkout sessions and payment links via Cloud Functions (secrets server-side only)

## Quick start

```bash
npm install
cp .env.example .env.local
```

Add Firebase config to `.env.local` (see `.env.example`), then seed the database:

```bash
# 1. Download service account JSON from Firebase Console → save as service-account.json
npm run seed

# 2. Start the app
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with seeded accounts:

| Role | Email | Password |
|------|-------|----------|
| Shop admin | admin@precisionautoworks.com | Makanika2026! |
| Customer | sarah.johnson@email.com | Makanika2026! |

New users can register at `/signup`.

## Firebase setup

1. Create a Firebase project
2. Enable Auth (Email/Password), Firestore, Storage
3. Copy web app config into `.env.local`
4. Deploy rules: `firebase deploy --only firestore:rules,storage`
5. Deploy functions: see [functions/README.md](functions/README.md)

## Server environment variables

Local: add these to `.env.local` (see `.env.example`). Never use `NEXT_PUBLIC_` for secrets.

| Variable | Used by |
|----------|---------|
| `OPENAI_API_KEY` | Booking assistant (`/api/chat`) |
| `OPENAI_MODEL` | Optional; default `gpt-4o-mini` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Verifies Firebase ID tokens on `/api/chat` |
| `STRIPE_SECRET_KEY` | Cloud Functions (not the Next.js app) |

Production (Firebase App Hosting or your host): set the **same variable names** in the backend **Environment variables** UI. `apphosting.yaml` only pins `OPENAI_MODEL`; add `OPENAI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_JSON` in the console.

## Tech stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS
- Firebase Auth, Firestore, Storage, Cloud Functions
- Stripe Payments (server-side)

## User roles

| Role | Access |
|------|--------|
| `shop_admin` | Full admin dashboard |
| `mechanic` | Admin dashboard (subset in production) |
| `customer` | Customer portal at `/portal` |

## Documentation

- [Firestore schema](docs/FIRESTORE_SCHEMA.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)
- [Cloud Functions](functions/README.md)

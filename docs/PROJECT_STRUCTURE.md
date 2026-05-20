# Makanika — Project Structure

```
makanika/
├── docs/
│   ├── FIRESTORE_SCHEMA.md
│   └── PROJECT_STRUCTURE.md
├── functions/                 # Firebase Cloud Functions (Stripe)
│   ├── src/index.ts
│   └── package.json
├── src/
│   ├── app/
│   │   ├── (admin)/           # Shop staff routes (protected)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   ├── vehicles/
│   │   │   ├── repair-orders/
│   │   │   ├── invoices/
│   │   │   ├── appointments/
│   │   │   ├── messages/
│   │   │   └── settings/
│   │   ├── (customer)/        # Customer portal (protected)
│   │   │   ├── layout.tsx
│   │   │   └── portal/
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── page.tsx           # Marketing landing
│   ├── components/
│   │   ├── auth/ProtectedRoute.tsx
│   │   ├── layout/            # AdminSidebar, CustomerSidebar, AdminHeader
│   │   ├── providers/AppProviders.tsx
│   │   └── ui/                # Button, Card, Badge, DataTable, etc.
│   ├── contexts/AuthContext.tsx
│   ├── data/mock.ts
│   ├── lib/
│   │   ├── firebase/
│   │   └── utils.ts
│   └── types/index.ts
├── firestore.rules
├── storage.rules
├── firebase.json
└── .env.example
```

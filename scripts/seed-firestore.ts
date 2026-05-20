/**
 * Seeds Firestore + Firebase Auth with demo data.
 *
 * Prerequisites:
 * 1. Download service account JSON from Firebase Console → Project Settings → Service accounts
 * 2. Save as ./service-account.json (gitignored)
 * 3. Run: npm run seed
 *
 * Demo accounts created:
 * - admin@precisionautoworks.com / Makanika2026!
 * - sarah.johnson@email.com / Makanika2026!
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";
import {
  MOCK_SHOP,
  MOCK_CUSTOMERS,
  MOCK_VEHICLES,
  MOCK_REPAIR_ORDERS,
  MOCK_ESTIMATES,
  MOCK_INVOICES,
  MOCK_APPOINTMENTS,
  MOCK_MESSAGES,
} from "../src/data/mock";

const ADMIN_EMAIL = "admin@precisionautoworks.com";
const CUSTOMER_EMAIL = "sarah.johnson@email.com";
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Makanika2026!";

function loadServiceAccount(): admin.ServiceAccount {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    return JSON.parse(jsonEnv) as admin.ServiceAccount;
  }

  const path = resolve(
    process.cwd(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./service-account.json"
  );

  if (!existsSync(path)) {
    console.error(`
Missing Firebase service account credentials.

Option A: Place service-account.json in project root
Option B: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
Option C: export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
`);
    process.exit(1);
  }

  return JSON.parse(readFileSync(path, "utf8")) as admin.ServiceAccount;
}

function toTimestamp(value: Date | undefined) {
  if (!value) return admin.firestore.FieldValue.serverTimestamp();
  return admin.firestore.Timestamp.fromDate(value);
}

function stripId<T extends { id: string }>({ id: _id, ...rest }: T) {
  return rest;
}

async function getOrCreateUser(
  auth: admin.auth.Auth,
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, displayName });
    console.log(`  Updated auth user: ${email}`);
    return existing.uid;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "auth/user-not-found"
    ) {
      const created = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log(`  Created auth user: ${email}`);
      return created.uid;
    }
    throw err;
  }
}

async function seed() {
  const serviceAccount = loadServiceAccount();
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    (serviceAccount as { project_id?: string }).project_id;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  const db = admin.firestore();
  const auth = admin.auth();

  console.log("\n🔧 Seeding Makanika Firestore + Auth...\n");

  const adminUid = await getOrCreateUser(
    auth,
    ADMIN_EMAIL,
    DEFAULT_PASSWORD,
    "Mike Rodriguez"
  );
  const customerUid = await getOrCreateUser(
    auth,
    CUSTOMER_EMAIL,
    DEFAULT_PASSWORD,
    "Sarah Johnson"
  );

  const batch = db.batch();

  batch.set(db.collection("shops").doc(MOCK_SHOP.id), {
    ...stripId(MOCK_SHOP),
    createdAt: toTimestamp(MOCK_SHOP.createdAt as Date),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(db.collection("users").doc(adminUid), {
    email: ADMIN_EMAIL,
    displayName: "Mike Rodriguez",
    role: "shop_admin",
    shopId: MOCK_SHOP.id,
    phone: MOCK_SHOP.phone,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(db.collection("users").doc(customerUid), {
    email: CUSTOMER_EMAIL,
    displayName: "Sarah Johnson",
    role: "customer",
    shopId: MOCK_SHOP.id,
    customerId: "cust_001",
    phone: "(512) 555-8921",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  for (const customer of MOCK_CUSTOMERS) {
    const data = stripId(customer);
    batch.set(db.collection("customers").doc(customer.id), {
      ...data,
      userId: customer.id === "cust_001" ? customerUid : data.userId ?? null,
      createdAt: toTimestamp(customer.createdAt as Date),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const vehicle of MOCK_VEHICLES) {
    batch.set(db.collection("vehicles").doc(vehicle.id), {
      ...stripId(vehicle),
      createdAt: toTimestamp(vehicle.createdAt as Date),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const order of MOCK_REPAIR_ORDERS) {
    const data = stripId(order);
    batch.set(db.collection("repairOrders").doc(order.id), {
      ...data,
      receivedAt: toTimestamp(order.receivedAt as Date),
      completedAt: order.completedAt
        ? toTimestamp(order.completedAt as Date)
        : null,
      scheduledPickupAt: order.scheduledPickupAt
        ? toTimestamp(order.scheduledPickupAt as Date)
        : null,
      createdAt: toTimestamp(order.createdAt as Date),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const estimate of MOCK_ESTIMATES) {
    const data = stripId(estimate);
    batch.set(db.collection("estimates").doc(estimate.id), {
      ...data,
      sentAt: estimate.sentAt ? toTimestamp(estimate.sentAt as Date) : null,
      respondedAt: estimate.respondedAt
        ? toTimestamp(estimate.respondedAt as Date)
        : null,
      validUntil: estimate.validUntil
        ? toTimestamp(estimate.validUntil as Date)
        : null,
      createdAt: toTimestamp(estimate.createdAt as Date),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const invoice of MOCK_INVOICES) {
    const data = stripId(invoice);
    batch.set(db.collection("invoices").doc(invoice.id), {
      ...data,
      dueDate: toTimestamp(invoice.dueDate as Date),
      paidAt: invoice.paidAt ? toTimestamp(invoice.paidAt as Date) : null,
      createdAt: toTimestamp(invoice.createdAt as Date),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const apt of MOCK_APPOINTMENTS) {
    batch.set(db.collection("appointments").doc(apt.id), {
      ...stripId(apt),
      scheduledAt: toTimestamp(apt.scheduledAt as Date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const msg of MOCK_MESSAGES) {
    const senderId =
      msg.senderRole === "shop_admin" ? adminUid : customerUid;
    batch.set(db.collection("messages").doc(msg.id), {
      ...stripId(msg),
      senderId,
      createdAt: toTimestamp(msg.createdAt as Date),
    });
  }

  await batch.commit();

  console.log("\n✅ Seed complete!\n");
  console.log("Demo sign-in credentials:");
  console.log(`  Shop admin:  ${ADMIN_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log(`  Customer:    ${CUSTOMER_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log("\nSet NEXT_PUBLIC_USE_MOCK_AUTH=false in .env.local\n");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";

admin.initializeApp();

const db = admin.firestore();

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "STRIPE_SECRET_KEY is not configured"
    );
  }
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

const PRODUCTION_APP_HOST = "makanika-oqw5.vercel.app";

function normalizeOrigin(url: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    if (parsed.pathname !== "/" && parsed.pathname !== "") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** Allowed redirect origins for Stripe Checkout (client appUrl + APP_URL env). */
function isAllowedAppOrigin(origin: string): boolean {
  const host = new URL(origin).hostname.toLowerCase();

  const envOrigin = process.env.APP_URL?.trim()
    ? normalizeOrigin(process.env.APP_URL)
    : null;
  if (envOrigin === origin) return true;

  for (const entry of process.env.ALLOWED_APP_URLS?.split(",") ?? []) {
    const allowed = normalizeOrigin(entry.trim());
    if (allowed === origin) return true;
  }

  if (host === PRODUCTION_APP_HOST) return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app") && host.startsWith("makanika")) return true;

  return false;
}

/** Public site URL for Stripe Checkout redirects. */
function resolveAppUrl(clientAppUrl?: string): string {
  const clientOrigin = clientAppUrl?.trim()
    ? normalizeOrigin(clientAppUrl)
    : null;
  if (clientOrigin && isAllowedAppOrigin(clientOrigin)) {
    return clientOrigin;
  }
  if (clientOrigin) {
    functions.logger.warn("Rejected client appUrl for Stripe redirect", {
      clientOrigin,
    });
  }

  const envOrigin = process.env.APP_URL?.trim()
    ? normalizeOrigin(process.env.APP_URL)
    : null;
  if (envOrigin) return envOrigin;

  functions.logger.warn(
    "APP_URL is not set; Stripe Checkout will redirect to http://localhost:3000"
  );
  return "http://localhost:3000";
}

interface InvoiceDoc {
  shopId: string;
  customerId: string;
  invoiceNumber: string;
  total: number;
  status: string;
  repairOrderId: string;
}

async function getInvoice(invoiceId: string): Promise<InvoiceDoc & { id: string }> {
  const snap = await db.collection("invoices").doc(invoiceId).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Invoice not found");
  }
  return { id: snap.id, ...(snap.data() as InvoiceDoc) };
}

async function recordCheckoutPayment(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  if (!invoiceId) return;

  const invoiceRef = db.collection("invoices").doc(invoiceId);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) return;

  const invoiceData = invoiceSnap.data() as InvoiceDoc;
  const amount = (session.amount_total ?? 0) / 100;
  const shopId = session.metadata?.shopId ?? invoiceData.shopId;
  const customerId = session.metadata?.customerId ?? invoiceData.customerId;

  await invoiceRef.update({
    status: "paid",
    amountPaid: invoiceData.total ?? amount,
    paidAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (invoiceData.repairOrderId) {
    const roRef = db.collection("repairOrders").doc(invoiceData.repairOrderId);
    const roSnap = await roRef.get();
    if (roSnap.exists) {
      const ro = roSnap.data();
      const terminal = ["completed", "ready_for_pickup"];
      await roRef.update({
        invoiceId,
        ...(terminal.includes(ro?.status as string)
          ? {}
          : {
              status: "completed",
              completedAt: FieldValue.serverTimestamp(),
            }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  const existing = await db
    .collection("payments")
    .where("stripeCheckoutSessionId", "==", session.id)
    .limit(1)
    .get();

  if (existing.empty) {
    await db.collection("payments").add({
      shopId,
      invoiceId,
      customerId,
      amount,
      currency: session.currency ?? "usd",
      status: "succeeded",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export const createStripeCheckoutSession = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }

    const { invoiceId, shopId, appUrl: clientAppUrl } = request.data as {
      invoiceId: string;
      shopId: string;
      appUrl?: string;
    };

    if (!invoiceId || !shopId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing invoiceId or shopId");
    }

    const invoice = await getInvoice(invoiceId);
    if (invoice.shopId !== shopId) {
      throw new functions.https.HttpsError("permission-denied", "Invoice shop mismatch");
    }

    const stripe = getStripe();
    const appUrl = resolveAppUrl(clientAppUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Repair order payment`,
            },
            unit_amount: Math.round(invoice.total * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        shopId,
        customerId: invoice.customerId,
      },
      success_url: `${appUrl}/portal/invoices?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/portal/invoices?cancelled=1`,
    });

    await db.collection("invoices").doc(invoiceId).update({
      stripeCheckoutSessionId: session.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { url: session.url, sessionId: session.id };
  }
);

export const confirmStripeCheckoutSession = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }

    const { sessionId } = request.data as { sessionId?: string };
    if (!sessionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing sessionId");
    }

    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    const userCustomerId = userSnap.data()?.customerId as string | undefined;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Payment has not completed yet"
      );
    }

    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid checkout session");
    }

    const invoice = await getInvoice(invoiceId);
    const sessionCustomerId = session.metadata?.customerId ?? invoice.customerId;

    if (userCustomerId && userCustomerId !== sessionCustomerId) {
      throw new functions.https.HttpsError("permission-denied", "Not your invoice");
    }

    await recordCheckoutPayment(session);

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount: (session.amount_total ?? 0) / 100,
      status: "paid",
    };
  }
);

export const createStripePaymentLink = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }

    const { invoiceId, shopId } = request.data as {
      invoiceId: string;
      shopId: string;
    };

    const invoice = await getInvoice(invoiceId);
    if (invoice.shopId !== shopId) {
      throw new functions.https.HttpsError("permission-denied", "Invoice shop mismatch");
    }

    const stripe = getStripe();

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice ${invoice.invoiceNumber}` },
            unit_amount: Math.round(invoice.total * 100),
          },
          quantity: 1,
        } as unknown as Stripe.PaymentLinkCreateParams.LineItem,
      ],
      metadata: { invoiceId, shopId, customerId: invoice.customerId },
    });

    await db.collection("invoices").doc(invoiceId).update({
      stripePaymentLinkId: paymentLink.id,
      status: "sent",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { url: paymentLink.url, paymentLinkId: paymentLink.id };
  }
);

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).send("Webhook secret not configured");
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    functions.logger.error("Webhook signature verification failed", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await recordCheckoutPayment(session);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = intent.metadata?.invoiceId;
    if (invoiceId) {
      await db.collection("invoices").doc(invoiceId).update({
        status: "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  res.json({ received: true });
});

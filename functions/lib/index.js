"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createStripePaymentLink = exports.confirmStripeCheckoutSession = exports.createStripeCheckoutSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
admin.initializeApp();
const db = admin.firestore();
function getStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new functions.https.HttpsError("failed-precondition", "STRIPE_SECRET_KEY is not configured");
    }
    return new stripe_1.default(secretKey, { apiVersion: "2025-02-24.acacia" });
}
/** Public site URL for Stripe Checkout redirects (set APP_URL on deployed functions). */
function getAppUrl() {
    var _a;
    const raw = (_a = process.env.APP_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (raw)
        return raw.replace(/\/$/, "");
    functions.logger.warn("APP_URL is not set; Stripe Checkout will redirect to http://localhost:3000");
    return "http://localhost:3000";
}
async function getInvoice(invoiceId) {
    const snap = await db.collection("invoices").doc(invoiceId).get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "Invoice not found");
    }
    return Object.assign({ id: snap.id }, snap.data());
}
async function recordCheckoutPayment(session) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const invoiceId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.invoiceId;
    if (!invoiceId)
        return;
    const invoiceRef = db.collection("invoices").doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists)
        return;
    const invoiceData = invoiceSnap.data();
    const amount = ((_b = session.amount_total) !== null && _b !== void 0 ? _b : 0) / 100;
    const shopId = (_d = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.shopId) !== null && _d !== void 0 ? _d : invoiceData.shopId;
    const customerId = (_f = (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.customerId) !== null && _f !== void 0 ? _f : invoiceData.customerId;
    await invoiceRef.update({
        status: "paid",
        amountPaid: (_g = invoiceData.total) !== null && _g !== void 0 ? _g : amount,
        paidAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if (invoiceData.repairOrderId) {
        const roRef = db.collection("repairOrders").doc(invoiceData.repairOrderId);
        const roSnap = await roRef.get();
        if (roSnap.exists) {
            const ro = roSnap.data();
            const terminal = ["completed", "ready_for_pickup"];
            await roRef.update(Object.assign(Object.assign({ invoiceId }, (terminal.includes(ro === null || ro === void 0 ? void 0 : ro.status)
                ? {}
                : {
                    status: "completed",
                    completedAt: firestore_1.FieldValue.serverTimestamp(),
                })), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
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
            currency: (_h = session.currency) !== null && _h !== void 0 ? _h : "usd",
            status: "succeeded",
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
}
exports.createStripeCheckoutSession = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }
    const { invoiceId, shopId } = request.data;
    if (!invoiceId || !shopId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing invoiceId or shopId");
    }
    const invoice = await getInvoice(invoiceId);
    if (invoice.shopId !== shopId) {
        throw new functions.https.HttpsError("permission-denied", "Invoice shop mismatch");
    }
    const stripe = getStripe();
    const appUrl = getAppUrl();
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
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { url: session.url, sessionId: session.id };
});
exports.confirmStripeCheckoutSession = functions.https.onCall(async (request) => {
    var _a, _b, _c, _d, _e;
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing sessionId");
    }
    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    const userCustomerId = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.customerId;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
        throw new functions.https.HttpsError("failed-precondition", "Payment has not completed yet");
    }
    const invoiceId = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.invoiceId;
    if (!invoiceId) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid checkout session");
    }
    const invoice = await getInvoice(invoiceId);
    const sessionCustomerId = (_d = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.customerId) !== null && _d !== void 0 ? _d : invoice.customerId;
    if (userCustomerId && userCustomerId !== sessionCustomerId) {
        throw new functions.https.HttpsError("permission-denied", "Not your invoice");
    }
    await recordCheckoutPayment(session);
    return {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        amount: ((_e = session.amount_total) !== null && _e !== void 0 ? _e : 0) / 100,
        status: "paid",
    };
});
exports.createStripePaymentLink = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }
    const { invoiceId, shopId } = request.data;
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
            },
        ],
        metadata: { invoiceId, shopId, customerId: invoice.customerId },
    });
    await db.collection("invoices").doc(invoiceId).update({
        stripePaymentLinkId: paymentLink.id,
        status: "sent",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { url: paymentLink.url, paymentLinkId: paymentLink.id };
});
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
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
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        functions.logger.error("Webhook signature verification failed", message);
        res.status(400).send(`Webhook Error: ${message}`);
        return;
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        await recordCheckoutPayment(session);
    }
    if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        const invoiceId = (_a = intent.metadata) === null || _a === void 0 ? void 0 : _a.invoiceId;
        if (invoiceId) {
            await db.collection("invoices").doc(invoiceId).update({
                status: "paid",
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
    }
    res.json({ received: true });
});
//# sourceMappingURL=index.js.map
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
const PRODUCTION_APP_HOST = "makanika-oqw5.vercel.app";
function normalizeOrigin(url) {
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const parsed = new URL(withProtocol);
        if (parsed.pathname !== "/" && parsed.pathname !== "")
            return null;
        return parsed.origin;
    }
    catch (_a) {
        return null;
    }
}
/** Allowed redirect origins for Stripe Checkout (client appUrl + APP_URL env). */
function isAllowedAppOrigin(origin) {
    var _a, _b, _c;
    const host = new URL(origin).hostname.toLowerCase();
    const envOrigin = ((_a = process.env.APP_URL) === null || _a === void 0 ? void 0 : _a.trim())
        ? normalizeOrigin(process.env.APP_URL)
        : null;
    if (envOrigin === origin)
        return true;
    for (const entry of (_c = (_b = process.env.ALLOWED_APP_URLS) === null || _b === void 0 ? void 0 : _b.split(",")) !== null && _c !== void 0 ? _c : []) {
        const allowed = normalizeOrigin(entry.trim());
        if (allowed === origin)
            return true;
    }
    if (host === PRODUCTION_APP_HOST)
        return true;
    if (host === "localhost" || host === "127.0.0.1")
        return true;
    if (host.endsWith(".vercel.app") && host.startsWith("makanika"))
        return true;
    return false;
}
/** Public site URL for Stripe Checkout redirects. */
function resolveAppUrl(clientAppUrl) {
    var _a;
    const clientOrigin = (clientAppUrl === null || clientAppUrl === void 0 ? void 0 : clientAppUrl.trim())
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
    const envOrigin = ((_a = process.env.APP_URL) === null || _a === void 0 ? void 0 : _a.trim())
        ? normalizeOrigin(process.env.APP_URL)
        : null;
    if (envOrigin)
        return envOrigin;
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
function stripeResourceId(value) {
    if (!value)
        return undefined;
    return typeof value === "string" ? value : value.id;
}
async function paymentAlreadyRecorded(params) {
    if (params.stripeCheckoutSessionId) {
        const bySession = await db
            .collection("payments")
            .where("stripeCheckoutSessionId", "==", params.stripeCheckoutSessionId)
            .limit(1)
            .get();
        if (!bySession.empty)
            return true;
    }
    if (params.stripePaymentIntentId) {
        const byIntent = await db
            .collection("payments")
            .where("stripePaymentIntentId", "==", params.stripePaymentIntentId)
            .limit(1)
            .get();
        if (!byIntent.empty)
            return true;
    }
    return false;
}
async function recordStripePayment(params) {
    var _a, _b, _c;
    const invoiceRef = db.collection("invoices").doc(params.invoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists)
        return;
    const invoiceData = invoiceSnap.data();
    const shopId = (_a = params.shopId) !== null && _a !== void 0 ? _a : invoiceData.shopId;
    const customerId = (_b = params.customerId) !== null && _b !== void 0 ? _b : invoiceData.customerId;
    await invoiceRef.update({
        status: "paid",
        amountPaid: (_c = invoiceData.total) !== null && _c !== void 0 ? _c : params.amount,
        paidAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if (invoiceData.repairOrderId) {
        const roRef = db.collection("repairOrders").doc(invoiceData.repairOrderId);
        const roSnap = await roRef.get();
        if (roSnap.exists) {
            const ro = roSnap.data();
            const terminal = ["completed", "ready_for_pickup"];
            await roRef.update(Object.assign(Object.assign({ invoiceId: params.invoiceId }, (terminal.includes(ro === null || ro === void 0 ? void 0 : ro.status)
                ? {}
                : {
                    status: "completed",
                    completedAt: firestore_1.FieldValue.serverTimestamp(),
                })), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
        }
    }
    const alreadyRecorded = await paymentAlreadyRecorded({
        stripeCheckoutSessionId: params.stripeCheckoutSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
    });
    if (alreadyRecorded)
        return;
    await db.collection("payments").add(Object.assign(Object.assign(Object.assign({ shopId, invoiceId: params.invoiceId, customerId, amount: params.amount, currency: params.currency, status: "succeeded" }, (params.stripeCheckoutSessionId
        ? { stripeCheckoutSessionId: params.stripeCheckoutSessionId }
        : {})), (params.stripePaymentIntentId
        ? { stripePaymentIntentId: params.stripePaymentIntentId }
        : {})), { createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
}
async function recordCheckoutPayment(session) {
    var _a, _b, _c, _d, _e;
    const invoiceId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.invoiceId;
    if (!invoiceId)
        return;
    await recordStripePayment({
        invoiceId,
        amount: ((_b = session.amount_total) !== null && _b !== void 0 ? _b : 0) / 100,
        currency: (_c = session.currency) !== null && _c !== void 0 ? _c : "usd",
        shopId: (_d = session.metadata) === null || _d === void 0 ? void 0 : _d.shopId,
        customerId: (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.customerId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: stripeResourceId(session.payment_intent),
    });
}
exports.createStripeCheckoutSession = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }
    const { invoiceId, shopId, appUrl: clientAppUrl } = request.data;
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
    var _a, _b, _c, _d, _e, _f;
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
            await recordStripePayment({
                invoiceId,
                amount: ((_c = (_b = intent.amount_received) !== null && _b !== void 0 ? _b : intent.amount) !== null && _c !== void 0 ? _c : 0) / 100,
                currency: (_d = intent.currency) !== null && _d !== void 0 ? _d : "usd",
                shopId: (_e = intent.metadata) === null || _e === void 0 ? void 0 : _e.shopId,
                customerId: (_f = intent.metadata) === null || _f === void 0 ? void 0 : _f.customerId,
                stripePaymentIntentId: intent.id,
            });
        }
    }
    res.json({ received: true });
});
//# sourceMappingURL=index.js.map
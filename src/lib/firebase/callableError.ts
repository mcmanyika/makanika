import { FirebaseError } from "firebase/app";

export function getCallableErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    const code = err.code.replace("functions/", "");
    if (code === "failed-precondition" && err.message.includes("STRIPE_SECRET_KEY")) {
      return "Stripe is not configured on the server. Deploy Cloud Functions with STRIPE_SECRET_KEY set.";
    }
    if (code === "unauthenticated") {
      return "Please sign in again to pay.";
    }
    if (code === "not-found") {
      return "Invoice not found.";
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes("internal")) {
      return "Payment service unavailable. Ensure Cloud Functions are deployed.";
    }
    return err.message;
  }
  return fallback;
}

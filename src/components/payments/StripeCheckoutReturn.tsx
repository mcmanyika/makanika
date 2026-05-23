"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { getFirebaseFunctions, isFirebaseConfigured } from "@/lib/firebase/config";
import { formatCurrency } from "@/lib/utils";

export function StripeCheckoutReturn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const paid = searchParams.get("paid");
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancelled");

    if (cancelled === "1" && !handled.current) {
      handled.current = true;
      setError("Payment was cancelled.");
      router.replace(window.location.pathname);
      return;
    }

    if (paid !== "1" || !sessionId || handled.current) return;
    handled.current = true;

    (async () => {
      try {
        if (!isFirebaseConfigured) {
          throw new Error("Firebase not configured");
        }
        const confirm = httpsCallable(
          getFirebaseFunctions(),
          "confirmStripeCheckoutSession"
        );
        const result = await confirm({ sessionId });
        const data = result.data as {
          invoiceNumber?: string;
          amount?: number;
        };
        const amountText =
          data.amount != null ? formatCurrency(data.amount) : "your invoice";
        setSuccess(
          `Payment of ${amountText}${data.invoiceNumber ? ` for ${data.invoiceNumber}` : ""} received.`
        );
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not confirm payment. It may still process shortly."
        );
      } finally {
        const path = window.location.pathname.startsWith("/portal/invoices")
          ? "/portal/invoices"
          : window.location.pathname.startsWith("/portal")
            ? "/portal/appointments"
            : window.location.pathname;
        router.replace(path);
      }
    })();
  }, [searchParams, router]);

  if (!success && !error) return null;

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8">
      <FormFeedback success={success} error={error} />
    </div>
  );
}

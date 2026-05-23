"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";

/** Customer home redirects to appointments — scheduling is the primary experience. */
export default function CustomerPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paid = searchParams.get("paid");
    const sessionId = searchParams.get("session_id");
    if (paid === "1" && sessionId) {
      router.replace(
        `/portal/invoices?paid=1&session_id=${encodeURIComponent(sessionId)}`
      );
      return;
    }
    const qs = searchParams.toString();
    router.replace(qs ? `/portal/appointments?${qs}` : "/portal/appointments");
  }, [router, searchParams]);

  return <PageLoader />;
}

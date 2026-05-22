"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";

/** Customer home redirects to appointments — scheduling is the primary experience. */
export default function CustomerPortalPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/appointments");
  }, [router]);

  return <PageLoader />;
}

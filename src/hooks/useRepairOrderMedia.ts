"use client";

import { where } from "firebase/firestore";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { MediaUpload } from "@/types";

export function useRepairOrderMedia(
  shopId: string | null | undefined,
  repairOrderId: string | null
) {
  return useFirestoreCollection<MediaUpload>({
    collectionName: COLLECTIONS.mediaUploads,
    constraints:
      shopId && repairOrderId
        ? [
            where("shopId", "==", shopId),
            where("repairOrderId", "==", repairOrderId),
          ]
        : [],
    enabled: !!shopId && !!repairOrderId,
  });
}

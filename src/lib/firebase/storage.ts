import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { getFirebaseStorage, getFirebaseDb } from "./config";
import { COLLECTIONS } from "./collections";
import type { MediaUpload } from "@/types";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/",
  "video/",
  "application/pdf",
];

export function isAcceptedRepairFile(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) return false;
  return ACCEPTED_TYPES.some((t) =>
    t.endsWith("/") ? file.type.startsWith(t) : file.type === t
  );
}

function mediaTypeFromFile(file: File): MediaUpload["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

export async function uploadRepairMedia(
  shopId: string,
  customerId: string,
  repairOrderId: string,
  file: File,
  uploadedBy: string,
  caption?: string
): Promise<string> {
  if (!isAcceptedRepairFile(file)) {
    throw new Error(
      "File must be an image, video, or PDF under 50 MB."
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `shops/${shopId}/repair-orders/${repairOrderId}/${Date.now()}.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadURL = await getDownloadURL(storageRef);

  const docRef = await addDoc(collection(getFirebaseDb(), COLLECTIONS.mediaUploads), {
    shopId,
    customerId,
    repairOrderId,
    uploadedBy,
    type: mediaTypeFromFile(file),
    fileName: file.name,
    storagePath: path,
    downloadURL,
    caption: caption?.trim() || null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.repairOrders, repairOrderId), {
    mediaIds: arrayUnion(docRef.id),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

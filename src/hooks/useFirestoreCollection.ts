"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  QueryConstraint,
  orderBy,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/config";
import { docToEntity } from "@/lib/firebase/converters";
import { CollectionName } from "@/lib/firebase/collections";

interface UseFirestoreCollectionOptions {
  collectionName: CollectionName;
  constraints?: QueryConstraint[];
  enabled?: boolean;
}

export function useFirestoreCollection<T extends { id: string }>({
  collectionName,
  constraints = [],
  enabled = true,
}: UseFirestoreCollectionOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(getFirebaseDb(), collectionName),
      ...constraints
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((d) => docToEntity<T>(d)));
        setLoading(false);
      },
      (err) => {
        console.error(`Firestore ${collectionName} error:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled, JSON.stringify(constraints.map(String))]);

  return { data, loading, error };
}

export function shopQuery(shopId: string) {
  return where("shopId", "==", shopId);
}

export function customerQuery(customerId: string) {
  return where("customerId", "==", customerId);
}

export function orderByCreatedDesc() {
  return orderBy("createdAt", "desc");
}

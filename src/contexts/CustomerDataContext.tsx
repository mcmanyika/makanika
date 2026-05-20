"use client";

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/config";
import { convertTimestamps } from "@/lib/firebase/converters";
import {
  useFirestoreCollection,
  customerQuery,
  orderByCreatedDesc,
} from "@/hooks/useFirestoreCollection";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  Vehicle,
  RepairOrder,
  Estimate,
  Invoice,
  Appointment,
  Message,
  Payment,
  Shop,
} from "@/types";

interface CustomerDataContextValue {
  shop: Shop | null;
  vehicles: Vehicle[];
  repairOrders: RepairOrder[];
  estimates: Estimate[];
  invoices: Invoice[];
  payments: Payment[];
  appointments: Appointment[];
  messages: Message[];
  loading: boolean;
  error: string | null;
}

const CustomerDataContext = createContext<CustomerDataContextValue | undefined>(
  undefined
);

export function CustomerDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const customerId = user?.customerId;
  const shopId = user?.shopId;
  const enabled = !!customerId && isFirebaseConfigured;

  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);

  useEffect(() => {
    if (!shopId || !isFirebaseConfigured) {
      setShopLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(getFirebaseDb(), COLLECTIONS.shops, shopId),
      (snap) => {
        if (snap.exists()) {
          setShop({
            id: snap.id,
            ...convertTimestamps(snap.data() as Record<string, unknown>),
          } as Shop);
        }
        setShopLoading(false);
      },
      () => setShopLoading(false)
    );
    return () => unsub();
  }, [shopId]);
  const constraints = customerId ? [customerQuery(customerId)] : [];
  const qOpts = { constraints, enabled };

  const vehicles = useFirestoreCollection<Vehicle>({
    collectionName: COLLECTIONS.vehicles,
    ...qOpts,
  });
  const repairOrders = useFirestoreCollection<RepairOrder>({
    collectionName: COLLECTIONS.repairOrders,
    ...qOpts,
  });
  const estimates = useFirestoreCollection<Estimate>({
    collectionName: COLLECTIONS.estimates,
    ...qOpts,
  });
  const invoices = useFirestoreCollection<Invoice>({
    collectionName: COLLECTIONS.invoices,
    ...qOpts,
  });
  const payments = useFirestoreCollection<Payment>({
    collectionName: COLLECTIONS.payments,
    constraints: customerId
      ? [customerQuery(customerId), orderByCreatedDesc()]
      : [],
    enabled,
  });
  const appointments = useFirestoreCollection<Appointment>({
    collectionName: COLLECTIONS.appointments,
    ...qOpts,
  });
  const messages = useFirestoreCollection<Message>({
    collectionName: COLLECTIONS.messages,
    ...qOpts,
  });

  const loading =
    shopLoading ||
    vehicles.loading ||
    repairOrders.loading ||
    estimates.loading ||
    invoices.loading ||
    payments.loading ||
    appointments.loading ||
    messages.loading;

  const error =
    vehicles.error ||
    repairOrders.error ||
    estimates.error ||
    invoices.error ||
    payments.error ||
    appointments.error ||
    messages.error ||
    null;

  const value = useMemo(
    () => ({
      shop,
      vehicles: vehicles.data,
      repairOrders: repairOrders.data,
      estimates: estimates.data,
      invoices: invoices.data,
      payments: payments.data,
      appointments: appointments.data,
      messages: messages.data,
      loading,
      error,
    }),
    [
      shop,
      vehicles.data,
      repairOrders.data,
      estimates.data,
      invoices.data,
      payments.data,
      appointments.data,
      messages.data,
      loading,
      error,
    ]
  );

  return (
    <CustomerDataContext.Provider value={value}>
      {children}
    </CustomerDataContext.Provider>
  );
}

export function useCustomerData() {
  const ctx = useContext(CustomerDataContext);
  if (!ctx) {
    throw new Error("useCustomerData must be used within CustomerDataProvider");
  }
  return ctx;
}

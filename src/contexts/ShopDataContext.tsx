"use client";

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestoreCollection, shopQuery } from "@/hooks/useFirestoreCollection";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  Shop,
  Customer,
  Vehicle,
  RepairOrder,
  Estimate,
  Invoice,
  Appointment,
  Message,
  Payment,
  DashboardStats,
  User,
} from "@/types";
import { computeDashboardStats } from "@/lib/dashboardStats";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/config";
import { useEffect, useState } from "react";
import { convertTimestamps } from "@/lib/firebase/converters";
interface ShopDataContextValue {
  shop: Shop | null;
  customers: Customer[];
  vehicles: Vehicle[];
  repairOrders: RepairOrder[];
  estimates: Estimate[];
  invoices: Invoice[];
  appointments: Appointment[];
  payments: Payment[];
  messages: Message[];
  users: User[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  getCustomer: (id: string) => Customer | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
}

const ShopDataContext = createContext<ShopDataContextValue | undefined>(
  undefined
);

export function ShopDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const shopId = user?.shopId;
  const enabled = !!shopId && isFirebaseConfigured;

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

  const constraints = shopId ? [shopQuery(shopId)] : [];
  const qOpts = { constraints, enabled };

  const customers = useFirestoreCollection<Customer>({
    collectionName: COLLECTIONS.customers,
    ...qOpts,
  });
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
  const appointments = useFirestoreCollection<Appointment>({
    collectionName: COLLECTIONS.appointments,
    ...qOpts,
  });
  const payments = useFirestoreCollection<Payment>({
    collectionName: COLLECTIONS.payments,
    ...qOpts,
  });
  const messages = useFirestoreCollection<Message>({
    collectionName: COLLECTIONS.messages,
    ...qOpts,
  });
  const users = useFirestoreCollection<User>({
    collectionName: COLLECTIONS.users,
    ...qOpts,
  });

  const loading =
    shopLoading ||
    customers.loading ||
    vehicles.loading ||
    repairOrders.loading ||
    estimates.loading ||
    invoices.loading ||
    appointments.loading ||
    payments.loading ||
    messages.loading ||
    users.loading;

  const error =
    customers.error ||
    vehicles.error ||
    repairOrders.error ||
    estimates.error ||
    invoices.error ||
    appointments.error ||
    payments.error ||
    messages.error ||
    users.error ||
    null;

  const stats = useMemo(
    () =>
      computeDashboardStats(
        repairOrders.data,
        invoices.data,
        appointments.data,
        payments.data
      ),
    [
      repairOrders.data,
      invoices.data,
      appointments.data,
      payments.data,
    ]
  );

  const value = useMemo<ShopDataContextValue>(
    () => ({
      shop,
      customers: customers.data,
      vehicles: vehicles.data,
      repairOrders: repairOrders.data,
      estimates: estimates.data,
      invoices: invoices.data,
      appointments: appointments.data,
      payments: payments.data,
      messages: messages.data,
      users: users.data,
      stats,
      loading,
      error,
      getCustomer: (id) => customers.data.find((c) => c.id === id),
      getVehicle: (id) => vehicles.data.find((v) => v.id === id),
    }),
    [
      shop,
      customers.data,
      vehicles.data,
      repairOrders.data,
      estimates.data,
      invoices.data,
      appointments.data,
      payments.data,
      messages.data,
      users.data,
      stats,
      loading,
      error,
    ]
  );

  return (
    <ShopDataContext.Provider value={value}>
      {children}
    </ShopDataContext.Provider>
  );
}

export function useShopData() {
  const ctx = useContext(ShopDataContext);
  if (!ctx) {
    throw new Error("useShopData must be used within ShopDataProvider");
  }
  return ctx;
}

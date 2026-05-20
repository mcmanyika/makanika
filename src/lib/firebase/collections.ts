export const COLLECTIONS = {
  users: "users",
  shops: "shops",
  customers: "customers",
  vehicles: "vehicles",
  repairOrders: "repairOrders",
  estimates: "estimates",
  invoices: "invoices",
  payments: "payments",
  appointments: "appointments",
  messages: "messages",
  mediaUploads: "mediaUploads",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

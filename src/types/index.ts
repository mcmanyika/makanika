import { Timestamp } from "firebase/firestore";

export type UserRole = "shop_admin" | "mechanic" | "customer";

export type RepairOrderStatus =
  | "received"
  | "diagnosing"
  | "waiting_approval"
  | "in_progress"
  | "completed"
  | "ready_for_pickup";

export type EstimateApprovalStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "declined";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  shopId?: string;
  customerId?: string;
  photoURL?: string;
  phone?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  stripeAccountId?: string;
  logoURL?: string;
  timezone: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Customer {
  id: string;
  shopId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  vehicleIds: string[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Vehicle {
  id: string;
  shopId: string;
  customerId: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  mileage?: number;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface RepairOrderJob {
  id: string;
  description: string;
  status: RepairOrderStatus;
  assignedMechanicName?: string;
  notes?: string;
}

export interface RepairOrder {
  id: string;
  shopId: string;
  customerId: string;
  vehicleId: string;
  orderNumber: string;
  status: RepairOrderStatus;
  assignedMechanicId?: string;
  assignedMechanicName?: string;
  description: string;
  /** Individual jobs on this repair order (job card line items). */
  jobs?: RepairOrderJob[];
  customerConcerns?: string;
  internalNotes?: string;
  estimateId?: string;
  invoiceId?: string;
  mediaIds: string[];
  scheduledPickupAt?: Timestamp | Date;
  receivedAt: Timestamp | Date;
  completedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface EstimateLineItem {
  id: string;
  description: string;
  type: "labor" | "parts" | "other";
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Estimate {
  id: string;
  shopId: string;
  repairOrderId: string;
  customerId: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  approvalStatus: EstimateApprovalStatus;
  customerNotes?: string;
  validUntil?: Timestamp | Date;
  sentAt?: Timestamp | Date;
  respondedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Invoice {
  id: string;
  shopId: string;
  repairOrderId: string;
  customerId: string;
  invoiceNumber: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  stripePaymentLinkId?: string;
  stripeCheckoutSessionId?: string;
  dueDate: Timestamp | Date;
  paidAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Payment {
  id: string;
  shopId: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Appointment {
  id: string;
  shopId: string;
  customerId: string;
  vehicleId?: string;
  repairOrderId?: string;
  title: string;
  description?: string;
  scheduledAt: Timestamp | Date;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Message {
  id: string;
  shopId: string;
  repairOrderId?: string;
  customerId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  body: string;
  read: boolean;
  createdAt: Timestamp | Date;
}

export interface MediaUpload {
  id: string;
  shopId: string;
  customerId: string;
  repairOrderId: string;
  uploadedBy: string;
  type: "image" | "video" | "document";
  fileName?: string;
  storagePath: string;
  downloadURL: string;
  caption?: string;
  createdAt: Timestamp | Date;
}

export interface DashboardStats {
  totalRevenue: number;
  stripePaymentCount: number;
  openRepairOrders: number;
  outstandingInvoices: number;
  appointmentsToday: number;
}

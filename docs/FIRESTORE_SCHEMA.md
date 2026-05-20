# Firestore Schema — Makanika

## Collections

### `users`
| Field | Type | Notes |
|-------|------|-------|
| email | string | |
| displayName | string | |
| role | string | `shop_admin` \| `mechanic` \| `customer` |
| shopId | string? | Staff only |
| customerId | string? | Links to `customers` doc |
| phone | string? | |
| photoURL | string? | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### `shops`
| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| address, city, state, zip | string | US format |
| phone, email | string | |
| stripeAccountId | string? | Connect (future) |
| timezone | string | e.g. `America/Chicago` |

### `customers`
| Field | Type | Notes |
|-------|------|-------|
| shopId | string | |
| userId | string? | Firebase Auth UID when portal enabled |
| firstName, lastName | string | |
| email, phone | string | |
| address, city, state, zip | string? | |
| vehicleIds | string[] | Denormalized refs |
| notes | string? | |

### `vehicles`
| Field | Type | Notes |
|-------|------|-------|
| shopId, customerId | string | |
| year, make, model | | |
| trim, vin, licensePlate, color | string? | |
| mileage | number? | |

### `repairOrders`
| Field | Type | Notes |
|-------|------|-------|
| shopId, customerId, vehicleId | string | |
| orderNumber | string | e.g. `RO-2026-0142` |
| status | string | See status enum in `src/types` |
| assignedMechanicId, assignedMechanicName | string? | |
| description, customerConcerns, internalNotes | string? | |
| estimateId, invoiceId | string? | |
| mediaIds | string[] | |
| receivedAt, completedAt, scheduledPickupAt | timestamp? | |

### `estimates`
| Field | Type | Notes |
|-------|------|-------|
| repairOrderId, customerId, shopId | string | |
| lineItems | array | `{ id, description, type, quantity, unitPrice, total }` |
| subtotal, tax, total | number | |
| approvalStatus | string | `pending` \| `approved` \| `changes_requested` \| `declined` |
| customerNotes | string? | |
| validUntil, sentAt, respondedAt | timestamp? | |

### `invoices`
| Field | Type | Notes |
|-------|------|-------|
| repairOrderId, customerId, shopId | string | |
| invoiceNumber | string | |
| lineItems | array | Same shape as estimates |
| subtotal, tax, total, amountPaid | number | |
| status | string | `draft` \| `sent` \| `paid` \| `overdue` \| `void` |
| stripePaymentLinkId, stripeCheckoutSessionId | string? | |
| dueDate, paidAt | timestamp | |

### `payments`
| Field | Type | Notes |
|-------|------|-------|
| invoiceId, shopId, customerId | string | |
| amount | number | |
| currency | string | `usd` |
| status | string | Written by webhook only |
| stripePaymentIntentId, stripeCheckoutSessionId | string? | |

### `appointments`
| Field | Type | Notes |
|-------|------|-------|
| shopId, customerId | string | |
| vehicleId, repairOrderId | string? | |
| title, description | string | |
| scheduledAt | timestamp | |
| durationMinutes | number | |
| status | string | |

### `messages`
| Field | Type | Notes |
|-------|------|-------|
| shopId, customerId | string | |
| repairOrderId | string? | |
| senderId, senderName | string | |
| senderRole | string | |
| body | string | |
| read | boolean | |

### `mediaUploads`
| Field | Type | Notes |
|-------|------|-------|
| shopId, repairOrderId | string | |
| uploadedBy | string | User UID |
| type | string | `image` \| `video` |
| storagePath, downloadURL | string | |
| caption | string? | |

## Relationships

```
shops
  └── customers
        └── vehicles
        └── repairOrders
              ├── estimates
              ├── invoices → payments
              └── mediaUploads
        └── appointments
        └── messages
```

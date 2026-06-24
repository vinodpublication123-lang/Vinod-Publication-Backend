# VINVERSE Phase 3 — API Documentation

## Overview

Phase 3 implements the complete VINVERSE commerce engine on top of the stable Phase 2 backend.

**Base URL:** `http://localhost:4000/api/v1`

**Authentication:** Bearer token via `Authorization: Bearer <accessToken>`

---

## Schema Changes

Two new tables were added and synced via `prisma db push`:

| Table | Purpose |
|---|---|
| `carts` | One-per-user persistent cart |
| `cart_items` | Items within a cart (product + optional size + quantity) |

Order, OrderItem, and TrackingInfo models already existed in Phase 2 schema — no changes needed.

---

## Execution Order (for Postman runner)

1. Register Customer / Login Admin
2. Create address (capture `addressId`)
3. Create a BOOK product + APPAREL product (capture IDs)
4. Cart operations (add, update, view, remove)
5. Checkout (capture `orderId`)
6. Customer order operations (list, get, tracking)
7. Admin order management (list, update status)
8. Admin tracking management (update tracking)
9. Cancel an eligible order
10. Analytics

---

## Phase 3 Endpoints

### CART — `/api/v1/cart`

All cart routes require `Authorization: Bearer <accessToken>` (CUSTOMER or ADMIN).

| Method | Path | Description |
|---|---|---|
| GET | `/cart` | Get current user's cart with totals |
| POST | `/cart/items` | Add item to cart (merges if exists) |
| PATCH | `/cart/items/:id` | Update item quantity |
| DELETE | `/cart/items/:id` | Remove single item |
| DELETE | `/cart` | Clear entire cart |

#### POST /cart/items — Body
```json
{
  "productId": "cuid",
  "sizeLabel": "SMALL",  // required for APPAREL, optional for others
  "quantity": 2
}
```

#### Business Rules
- Adding the same product+size again **merges** quantity (no duplicates)
- Stock is validated at add time and at merge time
- For APPAREL: `sizeLabel` is required and must match an existing size

---

### ORDERS (Customer) — `/api/v1/orders`

Requires `Authorization: Bearer <accessToken>` (CUSTOMER role).

| Method | Path | Description |
|---|---|---|
| POST | `/orders/checkout` | Checkout — creates order from cart |
| GET | `/orders` | List own orders (paginated) |
| GET | `/orders/:id` | Get single own order with items + tracking |
| PATCH | `/orders/:id/cancel` | Cancel PENDING or CONFIRMED order |
| GET | `/orders/:orderId/tracking` | View tracking for own order |

#### POST /orders/checkout — Body
```json
{
  "addressId": "cuid"
}
```

#### Checkout Transaction Steps
1. Load user's cart
2. Validate each item's stock
3. Calculate subtotal / tax / total (using StoreSettings tax rate)
4. Create `Order` with snapshot data
5. Create `OrderItem` records (immutable productName, sku, unitPrice snapshots)
6. Deduct inventory (apparel → size stock, others → globalStock)
7. Clear cart
8. Create `TrackingInfo` with status `NOT_DISPATCHED`

All steps run inside a single Prisma transaction — if anything fails, everything rolls back.

#### Order Number Format
```
VIN-YYYYMMDD-NNNN
Example: VIN-20260624-0001
```

---

### ORDERS (Admin) — `/api/v1/admin/orders`

Requires `Authorization: Bearer <adminAccessToken>` (ADMIN role).

| Method | Path | Description |
|---|---|---|
| GET | `/admin/orders` | List all orders with filters |
| GET | `/admin/orders/analytics` | Order analytics summary |
| GET | `/admin/orders/:id` | Full order detail |
| PATCH | `/admin/orders/:id/status` | Update order status |

#### GET /admin/orders — Query Parameters
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default 20, max 100) |
| `status` | OrderStatus | Filter by status |
| `paymentStatus` | PaymentStatus | Filter by payment status |
| `search` | string | Search by order number, customer name, email |
| `dateFrom` | ISO date | Filter placed after date |
| `dateTo` | ISO date | Filter placed before date |
| `sort` | string | Sort field (default `placedAt`) |
| `order` | asc\|desc | Sort direction (default `desc`) |

#### PATCH /admin/orders/:id/status — Body
```json
{ "status": "CONFIRMED" }
```

#### Allowed Status Transitions
```
PENDING → CONFIRMED, CANCELLED
CONFIRMED → PROCESSING, CANCELLED
PROCESSING → SHIPPED, CANCELLED
SHIPPED → DELIVERED
DELIVERED → REFUNDED
CANCELLED → (none)
REFUNDED → (none)
```

Invalid transitions return `409 Conflict`.

---

### TRACKING (Admin) — `/api/v1/admin/tracking`

Requires ADMIN role.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/tracking/:orderId` | Get tracking for order |
| PATCH | `/admin/tracking/:orderId` | Update tracking info |

#### PATCH /admin/tracking/:orderId — Body
```json
{
  "status": "DISPATCHED",
  "carrier": "FedEx",
  "trackingNumber": "1234567890",
  "trackingUrl": "https://fedex.com/track/1234567890",
  "notes": "Package handed to courier"
}
```

#### Auto-timestamp Rules
- When `status` becomes `DISPATCHED` → `shippedAt` is auto-set if not already set
- When `status` becomes `DELIVERED` → `deliveredAt` is auto-set if not already set

#### TrackingStatus Values
`NOT_DISPATCHED` | `DISPATCHED` | `IN_TRANSIT` | `OUT_FOR_DELIVERY` | `DELIVERED` | `RETURNED`

---

### ANALYTICS — `/api/v1/admin/orders/analytics`

Requires ADMIN role.

```json
{
  "success": true,
  "data": {
    "totalOrders": 42,
    "pendingOrders": 5,
    "completedOrders": 30,
    "cancelledOrders": 7,
    "revenue": 12540.00,
    "averageOrderValue": 298.57,
    "topProducts": [
      { "productId": "...", "productName": "The Quantum Enigma", "sku": "BOOK-01", "totalQuantitySold": 15 }
    ],
    "recentOrders": [...]
  }
}
```

---

## Error Responses

All errors follow the existing Phase 2 format:

```json
{ "success": false, "message": "Error description" }
```

| Code | When |
|---|---|
| `401` | Missing or invalid token |
| `403` | Insufficient role (e.g. customer accessing admin route) |
| `404` | Resource not found |
| `409` | Business rule conflict (stock, invalid status transition, cancellation not allowed) |
| `422` | Zod validation failure (invalid payload) |

---

## Inventory Safety

- All stock checks happen **inside the checkout transaction**
- Stock is decremented atomically — no race conditions with Prisma transactions
- Apparel stock is per-size (`ProductSize.stock`)
- Merchandise/Book stock is via `Product.globalStock`
- Cancellation **restores** inventory in a separate transaction

---

## Known Limitations (Phase 3)

1. **Payment**: Payment status is set to `PENDING` by default — actual payment gateway integration is Phase 4
2. **Shipping**: `shippingTotal` is always `0` — shipping rules are a Phase 4 concern
3. **Discount**: `discountTotal` is always `0` — coupon/discount system is a future phase
4. **Tax**: Reads from `StoreSettings.defaultTaxRate` — if no settings exist, tax is 0%

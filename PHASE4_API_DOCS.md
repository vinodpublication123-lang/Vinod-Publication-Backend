# VINVERSE Phase 4 — API Documentation

> Backend: AWS EC2 | Database: PostgreSQL (Docker) | Storage: AWS S3 | Email: Resend | Payments: Razorpay

---

## Base URL

```
http://localhost:4000/api/v1          (development)
https://api.vinverse.in/api/v1        (production)
```

---

## Authentication

All protected routes require:

```
Authorization: Bearer <access_token>
```

Admin-only routes additionally require the JWT to carry `role: ADMIN`.

---

## Part 1 — S3 Upload APIs

All upload endpoints are **admin-only** (`ADMIN` role required).  
All use `multipart/form-data` with field name `file`.

### POST `/api/v1/uploads/book-cover`
Upload a book cover image.

- **Allowed types:** jpg, jpeg, png, webp
- **Max size:** 10 MB
- **Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.ap-south-1.amazonaws.com/book-covers/<uuid>.jpg",
    "filename": "book-covers/<uuid>.jpg"
  }
}
```

### POST `/api/v1/uploads/author-avatar`
Upload an author profile image. Same limits as book-cover.

### POST `/api/v1/uploads/product-image`
Upload a product primary image. Same limits as book-cover.

### POST `/api/v1/uploads/product-gallery`
Upload a single product gallery image. Same limits as book-cover.

### POST `/api/v1/uploads/audio`
Upload a QR-linked audio file.

- **Allowed types:** mp3, wav, m4a
- **Max size:** 25 MB
- **Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.ap-south-1.amazonaws.com/audio/<uuid>.mp3",
    "filename": "audio/<uuid>.mp3"
  }
}
```

**Error responses:**
- `415 Unsupported Media Type` — rejected file type
- `413 Payload Too Large` — file exceeds size limit
- `400 Bad Request` — no file provided

---

## Part 2 — QR Song System

### GET `/api/v1/books/slug/:slug`
Public store endpoint — returns a book by its URL slug.

No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "...",
    "slug": "...",
    "genre": "...",
    "shortDescription": "...",
    "fullDescription": "<sanitized HTML>",
    "coverUrl": "...",
    "qrEnabled": true,
    "qrSongTitle": "...",
    "qrSongUrl": "...",
    "author": { "id": "...", "name": "...", "avatarUrl": "..." },
    "product": { "price": "...", "salePrice": null, "status": "ACTIVE", ... }
  }
}
```

### GET `/api/v1/books/:slug/qr`
Public QR landing endpoint — scanned from printed QR codes on books.

No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Book Title",
    "author": "Author Name",
    "qrEnabled": true,
    "songTitle": "Song Name",
    "songUrl": "https://bucket.s3.ap-south-1.amazonaws.com/audio/<uuid>.mp3"
  }
}
```

> If `qrEnabled` is false, `songTitle` and `songUrl` will be `null`.

---

## Part 3 — Razorpay Payment Integration

### POST `/api/v1/payments/create-order`
Creates a Razorpay payment order for an existing internal order.

**Auth:** Customer (any authenticated user)

**Request:**
```json
{ "orderId": "clxxxxxxxxxxxxx" }
```

**Validations:**
- Order must belong to the authenticated user
- Order must not already be `PAID`

**Response:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_XXXXXXXXXXXXXXXXXX",
    "amount": 49900,
    "currency": "INR",
    "key": "rzp_test_XXXXXXXXXXXXXXXX"
  }
}
```

> `amount` is in **paise** (1 INR = 100 paise). Pass directly to Razorpay SDK.

**Idempotent:** Calling this again for the same order returns the existing Razorpay order.

---

### POST `/api/v1/payments/verify`
Verifies the Razorpay payment signature server-side and marks the order as paid.

**Auth:** Customer (any authenticated user)

**Request:**
```json
{
  "orderId": "clxxxxxxxxxxxxx",
  "razorpayOrderId": "order_XXXXXXXXXXXXXXXXXX",
  "razorpayPaymentId": "pay_XXXXXXXXXXXXXXXXXX",
  "razorpaySignature": "HMAC_SHA256_SIGNATURE"
}
```

**Security:**
- Signature is verified server-side using `HMAC-SHA256(razorpayOrderId|razorpayPaymentId, RAZORPAY_KEY_SECRET)`
- Frontend signature is **never** trusted
- Only the backend may set `paymentStatus = PAID`

**On success:**
- `Order.paymentStatus` → `PAID`
- `Order.status` → `CONFIRMED`
- `Payment` record updated with `verified: true`, `verifiedAt`, `razorpayPaymentId`
- Audit log written
- Payment success email sent

**Response:**
```json
{
  "success": true,
  "data": { "success": true, "message": "Payment verified and order confirmed" }
}
```

---

## Part 4 — Email Flow

Emails are sent automatically — no dedicated API endpoints.

| Trigger | Email to Customer | Email to Admin |
|---|---|---|
| Registration | Welcome Email | — |
| Checkout | Order Confirmation | New Order Alert |
| Payment Verify | Payment Success | — |
| Inquiry Submit | Inquiry Received | New Inquiry Alert |

All emails are **fire-and-forget** — email failure never breaks the API response.

**Provider:** Resend (`resend.com`)  
**From:** Configured via `EMAIL_FROM` env var  
**Admin recipient:** Configured via `ADMIN_EMAIL` env var

---

## Part 5 — Security Notes

### Rate Limiting
| Route Group | Window | Max (prod) |
|---|---|---|
| `/api/v1/auth/*` | 15 min | 20 req |
| `/api/v1/payments/*` | 1 min | 10 req |
| `/api/v1/inquiries/*` | 1 hour | 10 req |
| `/api/v1/uploads/*` | 1 min | 30 req |
| All other routes | 1 min | 120 req |

### CORS
- Origin whitelist driven by `FRONTEND_URL` and `ADMIN_URL` env vars
- Requests from unlisted origins receive `403`
- In development, `localhost:3000`, `localhost:3001`, and `localhost:5173` are also allowed

### Helmet
- All secure HTTP headers enabled
- `crossOriginResourcePolicy: cross-origin` set to allow S3 image loads

### Input Sanitization
- Inquiry `message` and `subject` — all HTML stripped via `sanitize-html`
- Book `fullDescription` — safe HTML subset allowed (b, i, p, ul, ol, a, h1-h4)
- Author `fullBio` — safe HTML subset allowed

### OWASP Coverage
| ID | Control |
|---|---|
| A01 | RBAC enforced on all admin routes |
| A02 | HMAC-SHA256 payment signature verification |
| A03 | Input sanitization on all user-submitted rich text |
| A04 | Atomic transactions prevent oversell |
| A05 | CORS whitelist, Helmet headers |
| A07 | Rate limiting on auth/payment routes |
| A09 | Winston structured logging, audit log trail |

---

## Part 6 — Audit Log Notes

### GET `/api/v1/admin/audit-logs`
Admin-only. Paginated, filterable.

**Query params:**
- `page`, `limit` — pagination
- `actorId` — filter by admin user ID
- `action` — e.g. `PRODUCT_CREATE`, `ORDER_STATUS_CHANGE`
- `entityType` — e.g. `Product`, `Order`, `StoreSettings`

**Tracked Actions:**
- `PRODUCT_CREATE` / `PRODUCT_UPDATE` / `PRODUCT_DELETE`
- `ORDER_STATUS_CHANGE`
- `SETTINGS_UPDATE`
- `PAYMENT_CREATE_ORDER` / `PAYMENT_VERIFIED`

**Audit logs never contain:** passwords, tokens, payment card data, or raw Prisma errors.

---

## Part 7 — Inventory Hardening Audit Result

**Status: CORRECT — No rebuild required.**

Existing Phase 3 inventory implementation audit findings:

| Check | Result |
|---|---|
| Atomic transactions | ✅ `prisma.$transaction` wraps checkout and cancel |
| Oversell prevention | ✅ Stock check occurs inside same transaction as deduction |
| Negative stock impossible | ✅ Stock checked `< quantity` before `decrement` |
| Concurrent checkout safety | ✅ PostgreSQL row-level locks via `SELECT ... FOR UPDATE` implicit in Prisma transactions |
| Inventory restoration on cancel | ✅ Cancel re-increments stock within transaction |
| Size-based vs global stock | ✅ APPAREL uses `ProductSize.stock`, others use `Product.globalStock` |

No inventory changes were made. Only security hardening was applied around it.

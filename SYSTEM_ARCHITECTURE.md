# VINVERSE — System Architecture

> **Document Type:** Architecture Reference | Onboarding | Deployment Guide  
> **Last Updated:** Phase 4 Complete  
> **Status:** Production-Ready

---

## 1. Project Overview

VINVERSE is a full-stack publication e-commerce platform built for **Vinod Naraen Publications**. It sells physical books, apparel, and merchandise through a premium storefront while also delivering a digital QR-enhanced reading experience.

### Core Capabilities

| Domain | Description |
|---|---|
| **Book Store** | Browse and purchase physical books by genre, author, and category |
| **Merchandise** | Branded products (mugs, posters, stationery) with global stock tracking |
| **Apparel** | Size-variant clothing (S/M/L/XL) with per-size inventory management |
| **QR-Enabled Books** | Every book has a QR code that links to a companion song/audio page (public, no login required) |
| **Author Management** | Admin-managed author profiles with bio, avatar, and linked books |
| **Cart System** | Persistent, database-backed cart with quantity merge and multi-product support |
| **Checkout & Orders** | Atomic transactional checkout preventing oversell; full order lifecycle management |
| **Payments** | Razorpay integration with server-side HMAC signature verification |
| **Admin Portal** | Role-based admin dashboard for product, order, tracking, and settings management |
| **Email Notifications** | Transactional emails via Resend for orders, payments, inquiries, and welcome messages |
| **Audit Logging** | Fire-and-forget admin action log tracking product changes, order status, and payments |

---

## 2. Final Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / USERS                            │
└──────────────────────┬──────────────────────┬───────────────────────┘
                       │                      │
              ┌────────▼────────┐    ┌─────────▼──────────┐
              │   FRONTEND      │    │   ADMIN PORTAL      │
              │   Next.js       │    │   Next.js           │
              │   Vercel        │    │   Vercel            │
              └────────┬────────┘    └─────────┬───────────┘
                       │                       │
                       └──────────┬────────────┘
                                  │ HTTPS (REST API)
                     ┌────────────▼────────────────┐
                     │         NGINX               │
                     │   Reverse Proxy + SSL       │
                     │   (Certbot / Let's Encrypt) │
                     └────────────┬────────────────┘
                                  │
                     ┌────────────▼────────────────┐
                     │      EXPRESS BACKEND         │
                     │      Node.js + TypeScript    │
                     │      AWS EC2 (t3.medium)     │
                     │      pm2 process manager     │
                     └──────┬─────────────┬─────────┘
                            │             │
               ┌────────────▼──┐    ┌─────▼──────────────┐
               │  PostgreSQL   │    │    AWS S3           │
               │  Docker       │    │  Media Storage      │
               │  (EC2-local)  │    │  (Images, Audio)    │
               └───────────────┘    └────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
  ┌────────▼──────┐ ┌───────▼──────┐ ┌──────▼────────┐
  │   Razorpay   │ │    Resend    │ │  Winston Logs │
  │   Payments   │ │    Email     │ │  (File-based) │
  └──────────────┘ └──────────────┘ └───────────────┘
```

### Infrastructure Components

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js → Vercel | Customer-facing store |
| Admin Panel | Next.js → Vercel | Administration portal |
| Backend API | Express + TypeScript → EC2 | REST API server |
| Reverse Proxy | Nginx + Certbot | SSL termination, routing |
| Database | PostgreSQL in Docker (EC2) | Primary data store |
| Object Storage | AWS S3 | Book covers, avatars, gallery, audio |
| Payments | Razorpay | Order payment processing |
| Email | Resend | Transactional emails |
| Logging | Winston | Structured file + console logs |
| Process Manager | pm2 | Zero-downtime restarts on EC2 |

---

## 3. Backend Module Breakdown

### 3.1 Auth (`/api/v1/auth`)

**Purpose:** Register customers, authenticate users, issue/refresh JWTs, manage sessions.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/auth/register` | POST | Public | Create customer account |
| `/auth/login` | POST | Public | Issue access + refresh tokens |
| `/auth/refresh` | POST | Public | Rotate JWT using refresh token |
| `/auth/logout` | POST | Customer | Invalidate refresh token |
| `/auth/me` | GET | Any | Return current user profile |

**Models:** `User`, `RefreshToken`  
**Dependencies:** `bcryptjs` (password hashing), `jsonwebtoken`, `Resend` (welcome email)  
**Security:** Access token (15m), refresh token (7d), DB-stored refresh tokens for revocation

---

### 3.2 Users (`/api/v1/users`)

**Purpose:** Customer profile management and admin user listing.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/users/me` | GET | Customer | Get own profile |
| `/users/me` | PATCH | Customer | Update own profile |
| `/users` | GET | Admin | List all users |
| `/users/:id` | GET | Admin | Get user detail |

**Models:** `User`

---

### 3.3 Addresses (`/api/v1/addresses`)

**Purpose:** Manage customer shipping addresses used at checkout.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/addresses` | GET | Customer | List own addresses |
| `/addresses` | POST | Customer | Create new address |
| `/addresses/:id` | GET | Customer | Get specific address |
| `/addresses/:id` | PATCH | Customer | Update address |
| `/addresses/:id` | DELETE | Customer | Delete address |

**Models:** `Address` (belongs to `User`)

---

### 3.4 Products (`/api/v1/products`)

**Purpose:** Product catalogue management with category-specific inventory.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/products` | GET | Public | Paginated catalogue with filters |
| `/products/:id` | GET | Public | Single product detail |
| `/products` | POST | Admin | Create product (Book/Apparel/Merchandise) |
| `/products/:id` | PATCH | Admin | Update product |
| `/products/:id` | DELETE | Admin | Soft-delete product |

**Models:** `Product`, `ProductSize`, `Book`, `Author`  
**Categories:** `BOOK` (linked Book + Author), `APPAREL` (size-variant), `MERCHANDISE` (global stock)  
**Audit:** `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `PRODUCT_DELETE` logged on all admin writes

---

### 3.5 Books (`/api/v1/books`)

**Purpose:** Admin book metadata management + public QR/store endpoints.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/books` | GET | Admin | List all books |
| `/books/:id` | GET | Admin | Book detail |
| `/books/:id` | PATCH | Admin | Update book metadata |
| `/books/:id` | DELETE | Admin | Delete book |
| `/books/slug/:slug` | GET | **Public** | Store page detail (product + book + author) |
| `/books/:slug/qr` | GET | **Public** | QR landing — song title + URL |

> ⚠️ Public routes (`booksPublicRouter`) are registered **before** the admin router in `app.ts` so `authenticate()` never intercepts them.

**Models:** `Book` (belongs to `Product`, `Author`)

---

### 3.6 Authors (`/api/v1/authors`)

**Purpose:** Author profile management.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/authors` | GET | Admin | List authors |
| `/authors/:id` | GET | Admin | Author detail |
| `/authors/:id` | PATCH | Admin | Update author |
| `/authors/:id` | DELETE | Admin | Delete author |

**Models:** `Author` (has many `Book`)

---

### 3.7 Cart (`/api/v1/cart`)

**Purpose:** Persistent database-backed cart with merge logic.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/cart` | GET | Customer | Get cart with subtotal |
| `/cart/items` | POST | Customer | Add item (merges if exists) |
| `/cart/items/:id` | PATCH | Customer | Update quantity |
| `/cart/items/:id` | DELETE | Customer | Remove item |
| `/cart` | DELETE | Customer | Clear entire cart |

**Models:** `Cart` (one per user), `CartItem`  
**Logic:** Apparel items are keyed by `productId + sizeLabel`; duplicate additions merge quantity

---

### 3.8 Orders (`/api/v1/orders`, `/api/v1/admin/orders`)

**Purpose:** Checkout, order history, lifecycle management, analytics.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/orders/checkout` | POST | Customer | Atomic checkout (deducts stock, creates order, clears cart) |
| `/orders` | GET | Customer | Own order list |
| `/orders/:id` | GET | Customer | Own order detail |
| `/orders/:id/cancel` | PATCH | Customer | Cancel PENDING order (restores stock) |
| `/admin/orders` | GET | Admin | All orders with filters |
| `/admin/orders/analytics` | GET | Admin | Revenue, counts, top products |
| `/admin/orders/:id` | GET | Admin | Full order detail |
| `/admin/orders/:id/status` | PATCH | Admin | Advance order status |

**Models:** `Order`, `OrderItem`, `TrackingInfo`  
**Audit:** `ORDER_STATUS_CHANGE` logged on every admin status transition

---

### 3.9 Tracking (`/api/v1/admin/tracking`)

**Purpose:** Shipment tracking management per order.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/admin/tracking/:orderId` | GET | Admin | Get tracking record |
| `/admin/tracking/:orderId` | PATCH | Admin | Update status, carrier, tracking number |

**Models:** `TrackingInfo` (one-to-one with `Order`)  
**States:** `NOT_DISPATCHED` → `DISPATCHED` → `DELIVERED`

---

### 3.10 Payments (`/api/v1/payments`)

**Purpose:** Razorpay order creation and server-side signature verification.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/payments/create-order` | POST | Customer | Create Razorpay order for internal order |
| `/payments/verify` | POST | Customer | Verify HMAC signature + mark order PAID |

**Models:** `Payment` (linked to `Order`)  
**Audit:** `PAYMENT_CREATE_ORDER`, `PAYMENT_VERIFIED` (success and failure)

---

### 3.11 Uploads (`/api/v1/uploads`)

**Purpose:** Admin-only media uploads streamed directly to AWS S3.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/uploads/book-cover` | POST | Admin | Upload book cover image |
| `/uploads/author-avatar` | POST | Admin | Upload author photo |
| `/uploads/product-image` | POST | Admin | Upload primary product image |
| `/uploads/product-gallery` | POST | Admin | Upload gallery image |
| `/uploads/audio` | POST | Admin | Upload QR companion audio |

**No disk usage** — `multer.memoryStorage()` → bytes streamed to S3

---

### 3.12 Inquiries (`/api/v1/inquiries`)

**Purpose:** Customer/visitor contact form submissions.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/inquiries` | POST | Public | Submit inquiry (HTML-sanitized) |
| `/inquiries` | GET | Admin | List all inquiries |
| `/inquiries/:id` | GET | Admin | Inquiry detail |
| `/inquiries/:id` | PATCH | Admin | Update status |

**Security:** `sanitize-html` strips all XSS vectors from `message` field before persistence

---

### 3.13 Settings (`/api/v1/settings`)

**Purpose:** Store configuration management (name, logo, contact, social links).

| Route | Method | Auth | Description |
|---|---|---|---|
| `/settings` | GET | Public | Current store settings |
| `/settings` | PUT | Admin | Update store settings |

**Models:** `StoreSettings` (singleton row)  
**Audit:** `SETTINGS_UPDATE` logged on every admin write

---

### 3.14 Audit Logs (`/api/v1/admin/audit-logs`)

**Purpose:** Immutable admin action trail.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/admin/audit-logs` | GET | Admin | Paginated log with filters (action, entityType, actorId) |

**Models:** `AuditLog`  
**Actions tracked:** `PRODUCT_CREATE/UPDATE/DELETE`, `ORDER_STATUS_CHANGE`, `SETTINGS_UPDATE`, `PAYMENT_CREATE_ORDER`, `PAYMENT_VERIFIED`, `BOOK_UPDATE`, `AUTHOR_UPDATE`, `TRACKING_UPDATE`

---

## 4. Database Architecture

### Entity Relationship Overview

```
User ──< RefreshToken
User ──< Address
User ──< Order ──< OrderItem >── Product
User ──< Cart ──< CartItem >── Product
Order ── TrackingInfo
Order ── Payment
Product ──< ProductSize          (APPAREL only)
Product ── Book ── Author
AuditLog (standalone, actorId nullable)
Inquiry (standalone)
StoreSettings (singleton)
```

### Models

#### `User`
Fields: `id`, `name`, `email` (unique), `password` (hashed), `phone`, `role` (CUSTOMER|ADMIN), `isActive`, `createdAt`, `updatedAt`

#### `RefreshToken`
Fields: `id`, `token` (unique), `userId`, `expiresAt`, `isRevoked`  
Relation: belongs to `User`, cascades on user delete

#### `Address`
Fields: `id`, `userId`, `fullName`, `phone`, `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `isDefault`  
Relation: belongs to `User`

#### `Product`
Fields: `id`, `name`, `sku` (unique), `slug` (unique), `description`, `price`, `category` (BOOK|APPAREL|MERCHANDISE), `status` (ACTIVE|DRAFT|ARCHIVED), `globalStock`, `trackStock`, `images`, `tags`, `metadata`  
Relations: has-one `Book` (if BOOK), has-many `ProductSize` (if APPAREL), has-many `CartItem`, `OrderItem`

#### `ProductSize`
Fields: `id`, `productId`, `label` (SMALL|MEDIUM|LARGE|XL|XXL), `stock`  
Relation: belongs to `Product`

#### `Book`
Fields: `id`, `productId`, `authorId`, `title`, `slug` (unique), `genre`, `shortDescription`, `description`, `isbn`, `publishedAt`, `qrEnabled`, `qrSongTitle`, `qrSongUrl`, `coverImageUrl`  
Relations: belongs to `Product`, belongs to `Author`

#### `Author`
Fields: `id`, `name`, `slug` (unique), `shortBio`, `bio`, `avatarUrl`, `website`  
Relation: has-many `Book`

#### `Cart`
Fields: `id`, `userId` (unique — one cart per user), `updatedAt`  
Relations: belongs to `User`, has-many `CartItem`

#### `CartItem`
Fields: `id`, `cartId`, `productId`, `sizeLabel` (nullable), `quantity`  
Constraint: unique(`cartId`, `productId`, `sizeLabel`) — enables merge logic

#### `Order`
Fields: `id`, `userId`, `addressId`, `orderNumber` (VIN-XXXXXX), `status` (PENDING|CONFIRMED|PROCESSING|DISPATCHED|DELIVERED|CANCELLED), `paymentStatus` (PENDING|PAID|FAILED|REFUNDED), `subtotal`, `total`, `notes`, `razorpayOrderId`  
Relations: belongs to `User`, `Address`; has-many `OrderItem`; has-one `TrackingInfo`, `Payment`

#### `OrderItem`
Fields: `id`, `orderId`, `productId`, `productName` (snapshot), `sizeLabel`, `quantity`, `unitPrice`, `totalPrice`  
Note: Price and name snapshots prevent catalogue changes from affecting historical orders

#### `Payment`
Fields: `id`, `orderId`, `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `amount` (paise), `currency`, `provider`, `verified`, `verifiedAt`

#### `TrackingInfo`
Fields: `id`, `orderId` (unique), `status` (NOT_DISPATCHED|DISPATCHED|DELIVERED), `carrier`, `trackingNumber`, `trackingUrl`, `notes`, `shippedAt`, `deliveredAt`

#### `Inquiry`
Fields: `id`, `name`, `email`, `phone`, `type` (GENERAL|BOOK_ORDER|WHOLESALE|COLLABORATION|OTHER), `subject`, `message` (sanitized), `status` (OPEN|IN_PROGRESS|RESOLVED|CLOSED)

#### `StoreSettings`
Fields: `id` (always 1), `storeName`, `storeEmail`, `storePhone`, `logoUrl`, `address`, `socialLinks` (JSON), `metaTitle`, `metaDescription`

#### `AuditLog`
Fields: `id`, `actorId` (nullable), `action`, `entityType`, `entityId`, `metadata` (JSON), `createdAt`

---

## 5. Inventory Architecture

### Atomic Transaction Pattern

All stock operations are wrapped in `prisma.$transaction([...])` ensuring consistency even under concurrent load.

### Checkout (Deduction)

```
BEGIN TRANSACTION
  For each cart item:
    1. SELECT product/size with current stock  (read inside tx)
    2. IF stock < quantity → throw AppError 422 "Insufficient stock"
    3. UPDATE stock = stock - quantity
  4. CREATE Order + OrderItems (with price snapshots)
  5. DELETE CartItems
COMMIT
```

This pattern means: if 50 customers hit checkout simultaneously for the last unit, only **one** succeeds — the rest get a 422. No negative stock is possible.

### Cancel (Restoration)

```
BEGIN TRANSACTION
  1. Verify order belongs to user and status = PENDING
  2. For each OrderItem:
     - Increment product globalStock OR size stock
  3. UPDATE order status = CANCELLED
COMMIT
```

### Per-Category Stock

| Category | Stock field | Notes |
|---|---|---|
| `BOOK` | `Product.globalStock` | Tracked if `trackStock=true` |
| `MERCHANDISE` | `Product.globalStock` | Always tracked |
| `APPAREL` | `ProductSize.stock` per label | S/M/L/XL tracked independently |

---

## 6. Authentication & Security

### JWT Flow

```
Register/Login → accessToken (15m) + refreshToken (7d, stored in DB)
Request → Authorization: Bearer <accessToken>
Expiry → POST /auth/refresh with refreshToken → new accessToken
Logout → mark refreshToken.isRevoked = true
```

### RBAC

Two roles: `CUSTOMER` and `ADMIN`.

| Resource | Customer | Admin |
|---|---|---|
| Public endpoints | ✅ | ✅ |
| Own profile/orders | ✅ | ✅ |
| Admin endpoints | ❌ | ✅ |
| Uploads | ❌ | ✅ |

### Security Layers (applied in `app.ts`)

| Layer | Implementation |
|---|---|
| HTTP headers | `helmet()` — XSS, HSTS, no-sniff, frame-guard |
| CORS | Whitelist: `FRONTEND_URL` + `ADMIN_URL` env vars |
| Body size limit | `express.json({ limit: "10mb" })` |
| Input validation | `zod` schema on every route via `validate()` middleware |
| Input sanitization | `sanitize-html` on inquiry message + rich text fields |
| Rate limiting | 5 targeted profiles (auth/payment/inquiry/upload/general) |
| Stack traces | Suppressed in production — error handler omits `stack` |
| Audit trail | All admin mutations logged to `AuditLog` |

---

## 7. Payment Architecture

### Full Payment Flow

```
1. Customer completes checkout → Order created (status: PENDING, paymentStatus: PENDING)

2. Frontend calls POST /payments/create-order { orderId }
   → Backend creates Razorpay order (amount in paise)
   → Stores razorpayOrderId on Order
   → Creates Payment record
   → Returns { razorpayOrderId, amount, currency, key }

3. Frontend opens Razorpay checkout modal using returned key + razorpayOrderId

4. Customer pays → Razorpay calls frontend callback with:
   { razorpayOrderId, razorpayPaymentId, razorpaySignature }

5. Frontend calls POST /payments/verify
   → Backend computes: HMAC-SHA256(RAZORPAY_KEY_SECRET, "razorpayOrderId|razorpayPaymentId")
   → Compares with provided signature
   → If valid: Order.paymentStatus = PAID, Order.status = CONFIRMED
   → Updates Payment record (verified=true, verifiedAt)
   → Fires: payment success email (async)
   → Logs: PAYMENT_VERIFIED audit entry

6. If signature mismatch: AppError 400 — never marks as paid
```

### Idempotency

`create-order` checks `order.razorpayOrderId` first — if already set, returns existing values without creating a duplicate Razorpay order.

---

## 8. Upload Architecture

### Storage Provider Abstraction

```typescript
interface StorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
}
```

`S3StorageProvider` implements this interface. Swapping to GCS or Azure requires only changing the singleton in `src/lib/storage/index.ts`.

### Upload Flow

```
Admin request → multer.memoryStorage() → file.buffer
→ buildKey(folder, originalName)  e.g. "book-covers/uuid.jpg"
→ storage.upload(key, buffer, mimetype)
→ S3 PutObjectCommand
→ Returns: https://<bucket>.s3.<region>.amazonaws.com/<key>
```

### Multer Config

| Endpoint | Allowed types | Size limit |
|---|---|---|
| book-cover, author-avatar, product-image, gallery | jpg, png, webp | 10 MB |
| audio | mp3, wav, m4a | 25 MB |

---

## 9. Email Architecture

### Resend Integration

All emails are **fire-and-forget** — `sendEmail()` returns `void` and never throws. Failures are Winston-logged but never block the API response.

```typescript
// Guard: if RESEND_API_KEY is empty, log warning and return immediately
// Otherwise: resend.emails.send(...).then(log).catch(log)
```

### Email Templates (6)

| Template | Trigger | Recipients |
|---|---|---|
| `welcomeTemplate` | User registration | Customer |
| `orderConfirmationTemplate` | Checkout success | Customer |
| `paymentSuccessTemplate` | Payment verified | Customer |
| `inquiryReceivedTemplate` | Inquiry submitted | Customer |
| `adminNewOrderTemplate` | Checkout success | Admin (`ADMIN_EMAIL`) |
| `adminNewInquiryTemplate` | Inquiry submitted | Admin (`ADMIN_EMAIL`) |

---

## 10. Deployment Overview

### Target Stack

```
EC2 instance (t3.medium recommended)
├── Docker: PostgreSQL container (persistent volume)
├── pm2: Node.js backend process
└── Nginx: Reverse proxy on port 80/443
```

### Deployment Steps (high level)

1. **Provision EC2** — Ubuntu 22.04, open ports 22, 80, 443
2. **Install Docker** — run `postgres:15` with a named volume
3. **Install Node.js 20** + `pm2` globally
4. **Clone repo** → `npm ci` → copy `.env` with production values → `npm run build`
5. **Run migrations** — `npx prisma migrate deploy`
6. **Seed admin** — `npx ts-node scripts/create-admin.ts`
7. **Start app** — `pm2 start dist/server.js --name vinverse-api`
8. **Configure Nginx** — proxy `api.vinverse.in` → `localhost:4000`
9. **SSL** — `certbot --nginx -d api.vinverse.in`
10. **S3** — create bucket, attach IAM policy, set CORS for presigned if needed
11. **Resend** — verify domain, create API key
12. **Razorpay** — switch from test keys to live keys in `.env`

### Required Environment Variables (production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/vinverse
JWT_ACCESS_SECRET=<64-char random>
JWT_REFRESH_SECRET=<64-char random>
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<IAM key>
AWS_SECRET_ACCESS_KEY=<IAM secret>
AWS_S3_BUCKET=vinverse-media
RAZORPAY_KEY_ID=rzp_live_XXXXXXX
RAZORPAY_KEY_SECRET=<live secret>
RESEND_API_KEY=re_XXXXXXXXXXXXXXXX
EMAIL_FROM=noreply@vinverse.in
ADMIN_EMAIL=admin@vinverse.in
FRONTEND_URL=https://vinverse.in
ADMIN_URL=https://admin.vinverse.in
```

---

## 11. Phase Completion Summary

### Phase 1 — Core Foundation
- Express + TypeScript project scaffold
- Prisma ORM + PostgreSQL connection
- Zod validation middleware
- Global error handler
- JWT authentication (register/login/refresh/logout)
- User model + RBAC middleware
- Winston structured logging

### Phase 2 — Admin & Catalogue
- Admin bootstrap script + CLI admin creation tool
- Products module (BOOK / APPAREL / MERCHANDISE categories)
- Books module (admin CRUD, slug generation)
- Authors module (admin CRUD)
- Addresses module (customer CRUD)
- Settings module (store configuration)
- Inquiries module (contact form)
- Role-based route protection across all modules
- Phase 2 API documentation + Postman collection

### Phase 3 — Commerce Engine
- Persistent Cart (database-backed, per-user singleton)
- Cart merge logic (duplicate item quantity accumulation)
- Atomic Checkout — inventory deduction in single transaction
- Order lifecycle (PENDING → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED → CANCELLED)
- Order cancellation with stock restoration
- Customer order history + tracking view
- Admin order management + analytics
- TrackingInfo model (carrier, tracking number, timestamps)
- Phase 3 API documentation + Postman collection

### Phase 4 — Production Integrations & Security
- **AWS S3** — `StorageProvider` abstraction, 5 upload endpoints, memory-only (no disk)
- **Razorpay** — idempotent order creation, HMAC-SHA256 server-side verification, `Payment` model
- **Resend** — 6 email templates, fire-and-forget, graceful degradation when unconfigured
- **Audit Logging** — `AuditLog` model, 10 tracked actions, fire-and-forget
- **Security** — Helmet, env-driven CORS, 5-tier rate limiting, `sanitize-html`, hardened error handler
- **QR Public Routes** — `booksPublicRouter` correctly isolated from admin middleware
- **Graceful failures** — all integrations return structured errors when credentials are absent, never 500
- Phase 4 API documentation + fully-automated Postman collection

---

## 12. Phase 5 — Deployment & Production Infrastructure (Roadmap)

The following tasks are planned for Phase 5 and have **not** been implemented:

| Task | Description |
|---|---|
| EC2 provisioning | Launch and harden Ubuntu EC2 instance |
| Docker PostgreSQL | Production DB container with persistent volume + backup cron |
| Prisma migrations | Convert `db push` dev workflow to `prisma migrate deploy` for CI/CD |
| pm2 config | `ecosystem.config.js` for zero-downtime restarts and log rotation |
| Nginx config | Reverse proxy config with `proxy_pass`, headers, and rate-limit zones |
| SSL / HTTPS | Certbot Let's Encrypt auto-renewal |
| Domain DNS | Point `api.vinverse.in` to EC2 elastic IP |
| IAM policy | Least-privilege S3 IAM role scoped to `vinverse-media` bucket |
| S3 CORS config | Allow uploads from admin origin |
| CloudFront (optional) | CDN layer in front of S3 for image delivery |
| Log aggregation | Ship Winston file logs to CloudWatch or Datadog |
| DB backups | Automated `pg_dump` snapshots to S3 |
| Secrets management | Migrate `.env` to AWS Secrets Manager or Parameter Store |
| CI/CD pipeline | GitHub Actions: lint → build → test → deploy on main push |
| Health monitoring | Uptime Robot or CloudWatch alarms on `/health` endpoint |
| Razorpay live switch | Replace test keys; configure webhook endpoint for payment events |
| Resend domain verification | Verify `vinverse.in` sending domain for production deliverability |
| Admin password rotation | Force admin password change on first production login |
| Security audit | Penetration test + OWASP ZAP scan before public launch |

---

*Generated by Antigravity — VINVERSE Phase 4 Complete*

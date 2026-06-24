import cors from "cors";
import express from "express";
import helmet from "helmet";

// ── Core middleware ────────────────────────────────────────────────────────────
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import {
  authLimiter,
  paymentLimiter,
  inquiryLimiter,
  uploadLimiter,
  generalLimiter,
} from "./middleware/rateLimiter";

// ── Config ────────────────────────────────────────────────────────────────────
import { env } from "./config/env";

// ── Phase 2 routers ───────────────────────────────────────────────────────────
import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { productsRouter } from "./modules/products/products.routes";
import { booksRouter, booksPublicRouter } from "./modules/books/books.routes";
import { authorsRouter } from "./modules/authors/authors.routes";
import { inquiriesRouter } from "./modules/inquiries/inquiries.routes";
import { settingsRouter } from "./modules/settings/settings.routes";

// ── Phase 3 routers ───────────────────────────────────────────────────────────
import { cartRouter } from "./modules/cart/cart.routes";
import { ordersRouter, adminOrdersRouter } from "./modules/orders/orders.routes";
import { trackingRouter, adminTrackingRouter } from "./modules/tracking/tracking.routes";

// ── Phase 4 routers ───────────────────────────────────────────────────────────
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { auditRouter } from "./modules/audit/audit.routes";

// ─────────────────────────────────────────────────────────────────────────────
export const app = express();

// ── 1. Security headers (Helmet) ──────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy defaults from Helmet are suitable for an API
    // Frontend URLs are delivered via Vercel, not this server
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ── 2. CORS — environment-driven whitelist ────────────────────────────────────
const allowedOrigins = [
  env.FRONTEND_URL,
  env.ADMIN_URL,
  // In development also accept localhost variants
  ...(env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman in dev)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── 3. Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── 4. Request logging ────────────────────────────────────────────────────────
app.use(requestLogger());

// ── 5. General rate limiter (all routes) ─────────────────────────────────────
app.use(generalLimiter);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: { name: "VINVERSE Backend", phase: "Phase 4", status: "running" },
  });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);

// ── API v1 — Phase 2 ─────────────────────────────────────────────────────────
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/addresses", addressesRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/books", booksPublicRouter);      // public routes (no auth) — MUST be before admin router
app.use("/api/v1/books", booksRouter);            // admin routes (authenticated)
app.use("/api/v1/authors", authorsRouter);
app.use("/api/v1/inquiries", inquiryLimiter, inquiriesRouter);
app.use("/api/v1/settings", settingsRouter);

// ── API v1 — Phase 3 ─────────────────────────────────────────────────────────
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1", trackingRouter);              // GET /api/v1/orders/:id/tracking
app.use("/api/v1/admin/orders", adminOrdersRouter);
app.use("/api/v1/admin/tracking", adminTrackingRouter);

// ── API v1 — Phase 4 ─────────────────────────────────────────────────────────
app.use("/api/v1/uploads", uploadLimiter, uploadsRouter);
app.use("/api/v1/payments", paymentLimiter, paymentsRouter);
app.use("/api/v1/admin/audit-logs", auditRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

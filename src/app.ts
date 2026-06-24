import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { productsRouter } from "./modules/products/products.routes";
import { booksRouter } from "./modules/books/books.routes";
import { authorsRouter } from "./modules/authors/authors.routes";
import { inquiriesRouter } from "./modules/inquiries/inquiries.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
// Phase 3
import { cartRouter } from "./modules/cart/cart.routes";
import { ordersRouter, adminOrdersRouter } from "./modules/orders/orders.routes";
import { trackingRouter, adminTrackingRouter } from "./modules/tracking/tracking.routes";

export const app = express();

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: { name: "VINVERSE Backend", phase: "Phase 3", status: "running" },
  });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);

// ── API v1 — Phase 2 ─────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/addresses", addressesRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/books", booksRouter);
app.use("/api/v1/authors", authorsRouter);
app.use("/api/v1/inquiries", inquiriesRouter);
app.use("/api/v1/settings", settingsRouter);

// ── API v1 — Phase 3 ─────────────────────────────────────────────────────────
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", ordersRouter);
// Customer tracking: GET /api/v1/orders/:orderId/tracking
app.use("/api/v1", trackingRouter);
// Admin namespaced
app.use("/api/v1/admin/orders", adminOrdersRouter);
app.use("/api/v1/admin/tracking", adminTrackingRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

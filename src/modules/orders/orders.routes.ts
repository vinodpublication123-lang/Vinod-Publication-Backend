import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  checkoutSchema,
  orderParamsSchema,
  customerOrderQuerySchema,
  adminOrderQuerySchema,
  updateOrderStatusSchema,
} from "./orders.schemas";
import {
  postCheckout,
  getMyOrders,
  getMyOrder,
  postCancelOrder,
  getAdminOrders,
  getAdminOrderById,
  patchOrderStatus,
  fetchAnalytics,
} from "./orders.controller";

export const ordersRouter = Router();

// ── Customer routes ───────────────────────────────────────────────────────────

// POST /api/v1/orders/checkout
ordersRouter.post(
  "/checkout",
  authenticate(),
  authorize("CUSTOMER"),
  validate({ body: checkoutSchema }),
  postCheckout
);

// GET /api/v1/orders — own orders
ordersRouter.get(
  "/",
  authenticate(),
  authorize("CUSTOMER"),
  validate({ query: customerOrderQuerySchema }),
  getMyOrders
);

// GET /api/v1/orders/:id — own order detail
ordersRouter.get(
  "/:id",
  authenticate(),
  authorize("CUSTOMER"),
  validate({ params: orderParamsSchema }),
  getMyOrder
);

// PATCH /api/v1/orders/:id/cancel
ordersRouter.patch(
  "/:id/cancel",
  authenticate(),
  authorize("CUSTOMER"),
  validate({ params: orderParamsSchema }),
  postCancelOrder
);

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/v1/admin/orders/analytics — must come BEFORE /:id
export const adminOrdersRouter = Router();
adminOrdersRouter.use(authenticate(), authorize("ADMIN"));

// GET /api/v1/admin/orders/analytics
adminOrdersRouter.get(
  "/analytics",
  fetchAnalytics
);

// GET /api/v1/admin/orders
adminOrdersRouter.get(
  "/",
  validate({ query: adminOrderQuerySchema }),
  getAdminOrders
);

// GET /api/v1/admin/orders/:id
adminOrdersRouter.get(
  "/:id",
  validate({ params: orderParamsSchema }),
  getAdminOrderById
);

// PATCH /api/v1/admin/orders/:id/status
adminOrdersRouter.patch(
  "/:id/status",
  validate({ params: orderParamsSchema, body: updateOrderStatusSchema }),
  patchOrderStatus
);

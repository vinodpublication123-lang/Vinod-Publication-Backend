import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateTrackingSchema, trackingParamsSchema } from "./tracking.schemas";
import { fetchTracking, patchTracking } from "./tracking.controller";

export const trackingRouter = Router();

// GET /api/v1/orders/:orderId/tracking — Customer (own order)
trackingRouter.get(
  "/orders/:orderId/tracking",
  authenticate(),
  validate({ params: trackingParamsSchema }),
  fetchTracking
);

// Admin tracking routes
export const adminTrackingRouter = Router();
adminTrackingRouter.use(authenticate(), authorize("ADMIN"));

// GET /api/v1/admin/tracking/:orderId
adminTrackingRouter.get(
  "/:orderId",
  validate({ params: trackingParamsSchema }),
  fetchTracking
);

// PATCH /api/v1/admin/tracking/:orderId
adminTrackingRouter.patch(
  "/:orderId",
  validate({ params: trackingParamsSchema, body: updateTrackingSchema }),
  patchTracking
);

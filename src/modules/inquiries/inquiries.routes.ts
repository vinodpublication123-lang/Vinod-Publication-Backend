import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createInquirySchema,
  updateInquirySchema,
  inquiryParamsSchema,
  inquiryQuerySchema,
} from "./inquiries.schemas";
import { postInquiry, getInquiries, getInquiry, patchInquiry } from "./inquiries.controller";

export const inquiriesRouter = Router();

// POST /api/v1/inquiries — public
inquiriesRouter.post("/", validate({ body: createInquirySchema }), postInquiry);

// GET /api/v1/inquiries — ADMIN only
inquiriesRouter.get(
  "/",
  authenticate(),
  authorize("ADMIN"),
  validate({ query: inquiryQuerySchema }),
  getInquiries
);

// GET /api/v1/inquiries/:id — ADMIN only
inquiriesRouter.get(
  "/:id",
  authenticate(),
  authorize("ADMIN"),
  validate({ params: inquiryParamsSchema }),
  getInquiry
);

// PATCH /api/v1/inquiries/:id — ADMIN only
inquiriesRouter.patch(
  "/:id",
  authenticate(),
  authorize("ADMIN"),
  validate({ params: inquiryParamsSchema, body: updateInquirySchema }),
  patchInquiry
);

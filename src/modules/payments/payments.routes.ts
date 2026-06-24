import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPaymentOrderSchema, verifyPaymentSchema } from "./payments.schemas";
import { handleCreateOrder, handleVerifyPayment } from "./payments.controller";

export const paymentsRouter = Router();

// All payment routes require authentication (customer)
paymentsRouter.use(authenticate());

// POST /api/v1/payments/create-order
paymentsRouter.post(
  "/create-order",
  validate({ body: createPaymentOrderSchema }),
  handleCreateOrder
);

// POST /api/v1/payments/verify
paymentsRouter.post(
  "/verify",
  validate({ body: verifyPaymentSchema }),
  handleVerifyPayment
);

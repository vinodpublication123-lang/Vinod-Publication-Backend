import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  orderId: z.string().cuid(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().cuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

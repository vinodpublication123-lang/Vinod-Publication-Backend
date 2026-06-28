import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// ── Checkout ──────────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    address1: z.string().min(3),
    address2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(3),
    country: z.string().default("India"),
  }),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().min(1),
      sizeLabel: z.string().optional(),
    })
  ).min(1, "Cart is empty"),
});

// ── Params ────────────────────────────────────────────────────────────────────

export const orderParamsSchema = z.object({
  id: z.string().cuid({ message: "Invalid order ID" }),
});

// ── Customer order query ──────────────────────────────────────────────────────

export const customerOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ── Admin order query ─────────────────────────────────────────────────────────

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z
    .enum(["placedAt", "total", "createdAt", "updatedAt"])
    .optional()
    .default("placedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ── Admin status update ───────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CustomerOrderQuery = z.infer<typeof customerOrderQuerySchema>;
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

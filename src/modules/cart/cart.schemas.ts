import { z } from "zod";
import { ProductSizeLabel } from "@prisma/client";

// ── Cart item operations ──────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  productId: z.string().cuid({ message: "Invalid productId" }),
  variantId: z.string().cuid().optional(),
  sizeLabel: z.nativeEnum(ProductSizeLabel).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const cartItemParamsSchema = z.object({
  id: z.string().cuid({ message: "Invalid cart item ID" }),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

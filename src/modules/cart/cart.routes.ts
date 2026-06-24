import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
} from "./cart.schemas";
import {
  fetchCart,
  postCartItem,
  patchCartItem,
  deleteCartItem,
  deleteCart,
} from "./cart.controller";

export const cartRouter = Router();

// All cart routes require an authenticated CUSTOMER (or ADMIN for testing)
cartRouter.use(authenticate());

// GET /api/v1/cart
cartRouter.get("/", fetchCart);

// POST /api/v1/cart/items
cartRouter.post(
  "/items",
  validate({ body: addCartItemSchema }),
  postCartItem
);

// PATCH /api/v1/cart/items/:id
cartRouter.patch(
  "/items/:id",
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema }),
  patchCartItem
);

// DELETE /api/v1/cart/items/:id
cartRouter.delete(
  "/items/:id",
  validate({ params: cartItemParamsSchema }),
  deleteCartItem
);

// DELETE /api/v1/cart
cartRouter.delete("/", deleteCart);

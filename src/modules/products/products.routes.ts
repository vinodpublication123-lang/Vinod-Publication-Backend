import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
  productParamsSchema,
  productQuerySchema,
} from "./products.schemas";
import {
  getProducts,
  getProduct,
  postProduct,
  patchProduct,
  removeProduct,
} from "./products.controller";

export const productsRouter = Router();

// GET /api/v1/products  — public
productsRouter.get(
  "/",
  validate({ query: productQuerySchema }),
  getProducts
);

// GET /api/v1/products/:id  — public
productsRouter.get(
  "/:id",
  validate({ params: productParamsSchema }),
  getProduct
);

// POST /api/v1/products  — ADMIN only
productsRouter.post(
  "/",
  authenticate(),
  authorize("ADMIN"),
  validate({ body: createProductSchema }),
  postProduct
);

// PATCH /api/v1/products/:id  — ADMIN only
productsRouter.patch(
  "/:id",
  authenticate(),
  authorize("ADMIN"),
  validate({ params: productParamsSchema, body: updateProductSchema }),
  patchProduct
);

// DELETE /api/v1/products/:id  — ADMIN only
productsRouter.delete(
  "/:id",
  authenticate(),
  authorize("ADMIN"),
  validate({ params: productParamsSchema }),
  removeProduct
);

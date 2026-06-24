import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
} from "./addresses.schemas";
import {
  getAddresses,
  postAddress,
  patchAddress,
  removeAddress,
} from "./addresses.controller";

export const addressesRouter = Router();

addressesRouter.use(authenticate());

// GET /api/v1/addresses
addressesRouter.get("/", getAddresses);

// POST /api/v1/addresses
addressesRouter.post("/", validate({ body: createAddressSchema }), postAddress);

// PATCH /api/v1/addresses/:id
addressesRouter.patch(
  "/:id",
  validate({ params: addressParamsSchema, body: updateAddressSchema }),
  patchAddress
);

// DELETE /api/v1/addresses/:id
addressesRouter.delete(
  "/:id",
  validate({ params: addressParamsSchema }),
  removeAddress
);

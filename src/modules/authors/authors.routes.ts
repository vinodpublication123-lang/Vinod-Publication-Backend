import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateAuthorSchema, authorParamsSchema, authorQuerySchema } from "./authors.schemas";
import { getAuthors, getAuthor, patchAuthor, removeAuthor } from "./authors.controller";

export const authorsRouter = Router();

authorsRouter.use(authenticate(), authorize("ADMIN"));

// GET /api/v1/authors
authorsRouter.get("/", validate({ query: authorQuerySchema }), getAuthors);

// GET /api/v1/authors/:id
authorsRouter.get("/:id", validate({ params: authorParamsSchema }), getAuthor);

// PATCH /api/v1/authors/:id
authorsRouter.patch(
  "/:id",
  validate({ params: authorParamsSchema, body: updateAuthorSchema }),
  patchAuthor
);

// DELETE /api/v1/authors/:id
authorsRouter.delete(
  "/:id",
  validate({ params: authorParamsSchema }),
  removeAuthor
);

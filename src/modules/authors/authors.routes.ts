import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateAuthorSchema, authorParamsSchema, authorQuerySchema } from "./authors.schemas";
import { getAuthors, getAuthor, patchAuthor, removeAuthor } from "./authors.controller";

export const authorsRouter = Router();

// ── Public routes (no auth) ──────────────────────────────────────────────────
// GET /api/v1/authors  — public listing for the website
authorsRouter.get("/", validate({ query: authorQuerySchema }), getAuthors);

// GET /api/v1/authors/:id  — public author detail
authorsRouter.get("/:id", validate({ params: authorParamsSchema }), getAuthor);

// ── Admin-only routes ────────────────────────────────────────────────────────
// PATCH /api/v1/authors/:id
authorsRouter.patch(
  "/:id",
  authenticate(), authorize("ADMIN"),
  validate({ params: authorParamsSchema, body: updateAuthorSchema }),
  patchAuthor
);

// DELETE /api/v1/authors/:id
authorsRouter.delete(
  "/:id",
  authenticate(), authorize("ADMIN"),
  validate({ params: authorParamsSchema }),
  removeAuthor
);

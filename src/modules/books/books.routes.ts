import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateBookSchema, bookParamsSchema, bookQuerySchema } from "./books.schemas";
import { getBooks, getBook, patchBook, removeBook, getBookBySlugPublic, getBookQrPublic } from "./books.controller";

export const booksRouter = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────
// GET /api/v1/books  — public listing for the website
booksRouter.get("/", validate({ query: bookQuerySchema }), getBooks);

// GET /api/v1/books/:id  — public book detail
booksRouter.get("/:id", validate({ params: bookParamsSchema }), getBook);

// ── Admin-only routes ─────────────────────────────────────────────────────────
// PATCH /api/v1/books/:id
booksRouter.patch(
  "/:id",
  authenticate(), authorize("ADMIN"),
  validate({ params: bookParamsSchema, body: updateBookSchema }),
  patchBook
);

// DELETE /api/v1/books/:id
booksRouter.delete(
  "/:id",
  authenticate(), authorize("ADMIN"),
  validate({ params: bookParamsSchema }),
  removeBook
);

// ── Public routes (separate router, no auth) ──────────────────────────────────
// Mounted on separate router to avoid the admin authenticate() middleware above
export const booksPublicRouter = Router();

// GET /api/v1/books/slug/:slug  — public store detail page
booksPublicRouter.get("/slug/:slug", getBookBySlugPublic);

// GET /api/v1/books/:slug/qr  — QR code scan landing
booksPublicRouter.get("/:slug/qr", getBookQrPublic);


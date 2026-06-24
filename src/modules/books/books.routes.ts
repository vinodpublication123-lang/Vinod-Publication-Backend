import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateBookSchema, bookParamsSchema, bookQuerySchema } from "./books.schemas";
import { getBooks, getBook, patchBook, removeBook, getBookBySlugPublic, getBookQrPublic } from "./books.controller";

export const booksRouter = Router();

booksRouter.use(authenticate(), authorize("ADMIN"));

// GET /api/v1/books
booksRouter.get("/", validate({ query: bookQuerySchema }), getBooks);

// GET /api/v1/books/:id
booksRouter.get("/:id", validate({ params: bookParamsSchema }), getBook);

// PATCH /api/v1/books/:id
booksRouter.patch(
  "/:id",
  validate({ params: bookParamsSchema, body: updateBookSchema }),
  patchBook
);

// DELETE /api/v1/books/:id
booksRouter.delete("/:id", validate({ params: bookParamsSchema }), removeBook);

// ── Public routes (no auth) ───────────────────────────────────────────────────
// Mounted on separate router to avoid the admin authenticate() middleware above
export const booksPublicRouter = Router();

// GET /api/v1/books/slug/:slug  — public store detail page
booksPublicRouter.get("/slug/:slug", getBookBySlugPublic);

// GET /api/v1/books/:slug/qr  — QR code scan landing
booksPublicRouter.get("/:slug/qr", getBookQrPublic);


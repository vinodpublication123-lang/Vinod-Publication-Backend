import { z } from "zod";
import {
  ProductCategory,
  ProductStatus,
  ProductSizeLabel,
  OutOfStockBehavior,
} from "@prisma/client";

// ── Size ──────────────────────────────────────────────────────────────────────
const sizeSchema = z.object({
  label: z.nativeEnum(ProductSizeLabel),
  stock: z.number().int().min(0).default(0),
});

// ── Author (embedded in product creation) ───────────────────────────────────
const authorInputSchema = z.object({
  name: z.string().min(2).max(200),
  shortBio: z.string().max(500).optional(),
  fullBio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

// ── Book (embedded in product creation) ─────────────────────────────────────
const bookInputSchema = z.object({
  title: z.string().min(2).max(300),
  genre: z.string().max(100).optional(),
  publicationDate: z.coerce.date().optional(),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
  coverUrl: z.string().url().optional(),
  qrEnabled: z.boolean().optional().default(false),
  qrSongTitle: z.string().optional(),
  qrSongUrl: z.string().url().optional(),
  author: authorInputSchema,
});

// ── Product base ─────────────────────────────────────────────────────────────
const baseProductSchema = z.object({
  name: z.string().min(2).max(300),
  sku: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  category: z.nativeEnum(ProductCategory),
  status: z.nativeEnum(ProductStatus).optional().default("DRAFT"),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional().nullable(),
  tax: z.number().min(0).max(100).optional().default(0),
  trackStock: z.boolean().optional().default(true),
  globalStock: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  outOfStockBehavior: z
    .nativeEnum(OutOfStockBehavior)
    .optional()
    .default("SHOW_AS_OUT_OF_STOCK"),
  primaryImage: z.string().url().optional().nullable(),
  galleryImages: z.array(z.string().url()).optional().default([]),
  sizes: z.array(sizeSchema).optional().default([]),
  // Book-specific fields (only valid when category === BOOK)
  book: bookInputSchema.optional(),
});

// ── Cross-field validation ────────────────────────────────────────────────────
export const createProductSchema = baseProductSchema.superRefine((val, ctx) => {
  // salePrice must be <= price
  if (val.salePrice !== undefined && val.salePrice !== null && val.salePrice > val.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "salePrice must be less than or equal to price",
      path: ["salePrice"],
    });
  }

  if (val.category === "BOOK") {
    if (!val.book) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "book data is required for BOOK category products",
        path: ["book"],
      });
    }
  } else {
    if (val.book) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "book data is not allowed for non-BOOK category products",
        path: ["book"],
      });
    }
  }
});

export const updateProductSchema = baseProductSchema
  .partial()
  .superRefine((val, ctx) => {
    if (
      val.salePrice !== undefined &&
      val.salePrice !== null &&
      val.price !== undefined &&
      val.salePrice > val.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "salePrice must be less than or equal to price",
        path: ["salePrice"],
      });
    }

    if (val.category !== undefined && val.category !== "BOOK" && val.book) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "book data is not allowed for non-BOOK category products",
        path: ["book"],
      });
    }
  });

export const productParamsSchema = z.object({
  id: z.string().cuid(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  sort: z
    .enum(["name", "price", "createdAt", "updatedAt"])
    .optional()
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

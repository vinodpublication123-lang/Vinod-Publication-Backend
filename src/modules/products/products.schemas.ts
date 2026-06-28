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
  lowStockThreshold: z.number().int().min(0).optional().default(0),
});

// ── Variants ──────────────────────────────────────────────────────────────────
const variantImageSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  displayOrder: z.number().int().optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

const variantSizeSchema = z.object({
  id: z.string().optional(),
  label: z.nativeEnum(ProductSizeLabel),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(0),
});

const variantSchema = z.object({
  id: z.string().optional(),
  colourName: z.string().min(1),
  colourHex: z.string().optional().nullable(),
  displayOrder: z.number().int().optional().default(0),
  images: z.array(variantImageSchema).optional().default([]),
  sizes: z.array(variantSizeSchema).optional().default([]),
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
  coverUrl: z.string().optional(),
  qrEnabled: z.boolean().optional().default(false),
  qrSongTitle: z.string().optional(),
  qrSongUrl: z.string().optional(),
  // Either link to existing author by id, or provide inline author data
  authorId: z.string().optional(),
  author: authorInputSchema.optional(),
}).refine(
  (val) => val.authorId || val.author,
  { message: "Either authorId or author details must be provided", path: ["author"] }
);

// ── Product base ─────────────────────────────────────────────────────────────
const baseProductSchema = z.object({
  name: z.string().min(2).max(300),
  sku: z.string().min(1).max(100).optional(),
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
  primaryImage: z.string().optional().nullable(),
  galleryImages: z.array(z.string()).optional().default([]),
  sizes: z.array(sizeSchema).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
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
  } else if (val.category === "APPAREL") {
    // Apparel can have variants, but we don't strictly require it here to allow drafts
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

import { z } from "zod";

export const updateBookSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  genre: z.string().max(100).optional(),
  publicationDate: z.coerce.date().optional().nullable(),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
  coverUrl: z.string().url().optional().nullable(),
  qrEnabled: z.boolean().optional(),
  qrSongTitle: z.string().optional().nullable(),
  qrSongUrl: z.string().url().optional().nullable(),
});

export const bookParamsSchema = z.object({
  id: z.string().cuid(),
});

export const bookQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(["title", "publicationDate", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookQuery = z.infer<typeof bookQuerySchema>;

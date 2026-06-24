import { z } from "zod";
import { AuthorStatus } from "@prisma/client";

export const updateAuthorSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  shortBio: z.string().max(500).optional().nullable(),
  fullBio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  status: z.nativeEnum(AuthorStatus).optional(),
});

export const authorParamsSchema = z.object({
  id: z.string().cuid(),
});

export const authorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(AuthorStatus).optional(),
  sort: z.enum(["name", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;
export type AuthorQuery = z.infer<typeof authorQuerySchema>;

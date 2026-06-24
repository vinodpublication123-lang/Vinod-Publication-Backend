import { z } from "zod";
import { InquiryType, InquiryStatus } from "@prisma/client";

export const createInquirySchema = z.object({
  type: z.nativeEnum(InquiryType).optional().default("GENERAL"),
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(20).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(5).max(5000),
  metadata: z.record(z.unknown()).optional(),
});

export const updateInquirySchema = z.object({
  status: z.nativeEnum(InquiryStatus),
});

export const inquiryParamsSchema = z.object({
  id: z.string().cuid(),
});

export const inquiryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(InquiryType).optional(),
  status: z.nativeEnum(InquiryStatus).optional(),
  sort: z.enum(["createdAt", "updatedAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
export type InquiryQuery = z.infer<typeof inquiryQuerySchema>;

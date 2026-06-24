import { z } from "zod";
import { TrackingStatus } from "@prisma/client";

export const updateTrackingSchema = z.object({
  status: z.nativeEnum(TrackingStatus).optional(),
  carrier: z.string().max(100).optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
  trackingUrl: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  shippedAt: z.coerce.date().optional().nullable(),
  deliveredAt: z.coerce.date().optional().nullable(),
});

export const trackingParamsSchema = z.object({
  orderId: z.string().cuid({ message: "Invalid orderId" }),
});

export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;

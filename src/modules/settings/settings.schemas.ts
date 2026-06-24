import { z } from "zod";

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(20).optional().nullable(),
  currency: z.string().length(3).optional(),
  taxEnabled: z.boolean().optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  shippingEnabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

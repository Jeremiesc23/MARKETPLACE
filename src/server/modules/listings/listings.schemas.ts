import { z } from "zod";

export const createListingSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).default("USD"),
  locationText: z.string().trim().max(200).optional(),

  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const updateListingSchema = createListingSchema.partial();

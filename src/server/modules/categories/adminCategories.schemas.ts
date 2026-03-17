import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const AdminCreateCategorySchema = z.object({
  verticalSlug: z
    .string()
    .trim()
    .min(2, "Vertical requerida")
    .max(100)
    .regex(slugRegex, "Vertical inválida"),
  name: z.string().trim().min(2, "Nombre requerido").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug requerido")
    .max(120)
    .regex(slugRegex, "Slug inválido (usa a-z, 0-9 y guiones)"),
  isActive: z.boolean().optional().default(true),
});

export const AdminUpdateCategorySchema = z.object({
  verticalSlug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(slugRegex, "Vertical inválida")
    .optional(),
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(slugRegex, "Slug inválido (usa a-z, 0-9 y guiones)")
    .optional(),
  isActive: z.boolean().optional(),
});
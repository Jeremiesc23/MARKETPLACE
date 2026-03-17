//adminSites.schemas.ts
import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  });

export const AdminCreateSiteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subdomain: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugRegex, "Subdominio inválido (usa a-z, 0-9 y guiones)"),
  verticalSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugRegex, "Vertical inválida (usa a-z, 0-9 y guiones)"),
  contactPhone: optionalText,
  whatsappPhone: optionalText,
  facebookUrl: optionalText.refine(
    (v) => !v || /^https?:\/\/.+/i.test(v),
    "Facebook URL inválida"
  ),
  instagramUsername: optionalText.transform((v) =>
    v ? v.replace(/^@+/, "") : undefined
  ),
  owner: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    tempPassword: z.string().min(8).max(64),
  }),
});

export const AdminUpdateSiteSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  subdomain: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugRegex, "Subdominio inválido (usa a-z, 0-9 y guiones)")
    .optional(),
  verticalSlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(slugRegex, "Vertical inválida (usa a-z, 0-9 y guiones)")
    .optional(),
  isActive: z.boolean().optional(),
  contactPhone: optionalText,
  whatsappPhone: optionalText,
  facebookUrl: optionalText.refine(
    (v) => !v || /^https?:\/\/.+/i.test(v),
    "Facebook URL inválida"
  ),
  instagramUsername: optionalText.transform((v) =>
    v ? v.replace(/^@+/, "") : undefined
  ),
});
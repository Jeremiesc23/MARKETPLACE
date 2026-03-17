import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const keyRegex = /^[a-z0-9_]+$/;
const fieldType = z.enum(["text", "number", "boolean", "select"]);

function parseJsonOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch { return s; }
  }
  return v;
}

export const AdminCreateFieldSchema = z.object({
  verticalSlug: z.string().trim().min(2).max(80).regex(slugRegex, "Vertical inválida"),
  key: z.string().trim().min(2).max(64).regex(keyRegex, "Key inválida (usa a-z, 0-9 y _ )"),
  label: z.string().trim().min(2).max(120),
  type: fieldType.default("text"),
  options: z.preprocess(parseJsonOrNull, z.any().nullable()).optional(),
  constraints: z.preprocess(parseJsonOrNull, z.any().nullable()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const AdminUpdateFieldSchema = z.object({
  label: z.string().trim().min(2).max(120).optional(),
  type: fieldType.optional(),
  options: z.preprocess(parseJsonOrNull, z.any().nullable()).optional(),
  constraints: z.preprocess(parseJsonOrNull, z.any().nullable()).optional(),
  isActive: z.boolean().optional(),
});
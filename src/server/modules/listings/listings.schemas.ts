import { z } from "zod";

// Helpers: convierten null / "" -> undefined
const optionalTrimmedString = (max: number) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v !== "string") return v;
    const s = v.trim();
    return s.length ? s : undefined;
  }, z.string().max(max).optional());

const optionalNumber = () =>
  z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    return v;
  }, z.coerce.number().nonnegative().optional());

const currency3 = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== "string") return v;
  return v.trim().toUpperCase();
}, z.string().length(3));

export const createListingSchema = z.object({
  categoryId: z.preprocess((v) => {
    // evita que null se vuelva 0
    if (v === null || v === undefined || v === "") return v;
    return v;
  }, z.coerce.number().int().positive()),

  title: z.string().trim().min(3).max(200),

  // ✅ acepta null / "" y lo normaliza a undefined
  description: optionalTrimmedString(5000),

  // ✅ acepta null / "" y lo normaliza a undefined (y evita null->0)
  price: optionalNumber(),

  // ✅ en create sí queremos default
  currency: currency3.optional().default("USD"),

  // ✅ acepta null / "" y lo normaliza a undefined
  locationText: optionalTrimmedString(200),

  // ✅ acepta undefined; si te mandan null y quieres aceptarlo:
  attributes: z
    .preprocess((v) => (v === null ? undefined : v), z.record(z.string(), z.unknown()).optional()),
});

// ⚠️ Para PATCH: NO queremos que default("USD") se aplique si no mandan currency.
// Por eso redefinimos currency como optional SIN default.
export const updateListingSchema = createListingSchema
  .partial()
  .extend({
    currency: currency3.optional(),
  });
import { ZodError } from "zod";
import { AppError } from "@/src/server/shared/errors";
import { AdminCreateFieldSchema, AdminUpdateFieldSchema } from "./adminFields.schemas";
import { adminCreateField, adminGetFieldById, adminListFieldsByVertical, adminUpdateField } from "./adminFields.repo";

export async function adminFieldsList(verticalSlug: string) {
  const v = String(verticalSlug || "").trim();
  if (!v) throw new AppError("Vertical requerida", 400);
  return adminListFieldsByVertical(v);
}

export async function adminFieldsCreate(raw: unknown) {
  try {
    const input = AdminCreateFieldSchema.parse(raw);
    return await adminCreateField({
      verticalSlug: input.verticalSlug,
      key: input.key,
      label: input.label,
      type: input.type,
      options: input.options ?? null,
      constraints: input.constraints ?? null,
      isActive: input.isActive,
    });
  } catch (e: any) {
    if (e instanceof ZodError) throw new AppError(e.issues[0]?.message || "Datos inválidos", 400);
    if (e?.code === "ER_DUP_ENTRY") throw new AppError("Key duplicada en esta vertical", 409); // uq_fields_vertical_key :contentReference[oaicite:3]{index=3}
    throw e;
  }
}

export async function adminFieldsGet(fieldId: number) {
  const field = await adminGetFieldById(fieldId);
  if (!field) throw new AppError("Field no encontrado", 404);
  return field;
}

export async function adminFieldsPatch(fieldId: number, raw: unknown) {
  try {
    const patch = AdminUpdateFieldSchema.parse(raw);
    await adminUpdateField(fieldId, {
      label: patch.label,
      type: patch.type,
      options: patch.options,
      constraints: patch.constraints,
      isActive: patch.isActive,
    });
  } catch (e: any) {
    if (e instanceof ZodError) throw new AppError(e.issues[0]?.message || "Datos inválidos", 400);
    throw e;
  }
}
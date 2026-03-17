import { ZodError } from "zod";
import { AppError } from "@/src/server/shared/errors";
import {
  AdminCreateCategorySchema,
  AdminUpdateCategorySchema,
} from "./adminCategories.schemas";
import {
  adminCreateCategory,
  adminGetCategoryById,
  adminListCategoriesByVertical,
  adminUpdateCategory,
} from "./adminCategories.repo";

export async function adminCategoriesList(verticalSlug: string) {
  const vertical = String(verticalSlug || "").trim();
  if (!vertical) {
    throw new AppError("Vertical requerida", 400);
  }

  return adminListCategoriesByVertical(vertical);
}

export async function adminCategoriesGet(categoryId: number) {
  const category = await adminGetCategoryById(categoryId);
  if (!category) {
    throw new AppError("Categoría no encontrada", 404);
  }
  return category;
}

export async function adminCategoriesCreate(raw: unknown) {
  try {
    const input = AdminCreateCategorySchema.parse(raw);

    return await adminCreateCategory({
      verticalSlug: input.verticalSlug,
      name: input.name,
      slug: input.slug,
      isActive: input.isActive,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw new AppError(err.issues[0]?.message || "Datos inválidos", 400);
    }

    const e = err as { code?: string };
    if (e?.code === "ER_DUP_ENTRY") {
      throw new AppError("Slug duplicado en esta vertical", 409);
    }

    throw err;
  }
}

export async function adminCategoriesPatch(
  categoryId: number,
  raw: unknown
) {
  try {
    const patch = AdminUpdateCategorySchema.parse(raw);

    await adminUpdateCategory(categoryId, {
      verticalSlug: patch.verticalSlug,
      name: patch.name,
      slug: patch.slug,
      isActive: patch.isActive,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw new AppError(err.issues[0]?.message || "Datos inválidos", 400);
    }

    const e = err as { code?: string };
    if (e?.code === "ER_DUP_ENTRY") {
      throw new AppError("Slug duplicado en esta vertical", 409);
    }

    throw err;
  }
}
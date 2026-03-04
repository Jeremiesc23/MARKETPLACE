// src/server/modules/categories/categoryFields.service.ts
import { AppError } from "@/src/server/shared/errors";
import { getCategoryByIdAndVertical, listFieldsByCategory } from "./categoryFields.repo";

export async function getCategoryFieldsForVertical(categoryId: number, vertical: string) {
  const category = await getCategoryByIdAndVertical(categoryId, vertical);

  // 🔒 si la categoría existe pero es de OTRO vertical => aquí igual regresa 404
  if (!category) throw new AppError("Categoría no encontrada", 404);

  const fields = await listFieldsByCategory(categoryId, vertical);

  return {
    categoryId,
    vertical,
    fields,
  };
}
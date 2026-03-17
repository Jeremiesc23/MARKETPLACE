import { AppError } from "@/src/server/shared/errors";
import { adminGetCategory, adminListAssignedFields, adminAssignFieldToCategory, adminUpdateRequired, adminReorder, adminRemoveFieldFromCategory, adminApplyFieldToAllCategoriesInVertical } from "./adminCategoryFields.repo";
import { adminFieldsGet } from "./adminFields.service";

export async function adminCategoryFieldsList(categoryId: number) {
  const category = await adminGetCategory(categoryId);
  if (!category) throw new AppError("Categoría no encontrada", 404);

  const fields = await adminListAssignedFields(categoryId, category.vertical_slug);
  return { category, fields };
}

export async function adminCategoryFieldsAdd(categoryId: number, fieldId: number, isRequired: boolean) {
  const category = await adminGetCategory(categoryId);
  if (!category) throw new AppError("Categoría no encontrada", 404);

  const field = await adminFieldsGet(fieldId);
  if (field.vertical_slug !== category.vertical_slug) {
    throw new AppError("El field no pertenece a la misma vertical", 409);
  }

  await adminAssignFieldToCategory({ categoryId, fieldId, isRequired });
}

export async function adminCategoryFieldsToggleRequired(categoryId: number, fieldId: number, isRequired: boolean) {
  await adminUpdateRequired(categoryId, fieldId, isRequired);
}

export async function adminCategoryFieldsReorder(categoryId: number, fieldIds: number[]) {
  if (!Array.isArray(fieldIds) || fieldIds.length === 0) return;
  await adminReorder(categoryId, fieldIds.map(Number).filter(Number.isFinite));
}

export async function adminCategoryFieldsRemove(categoryId: number, fieldId: number) {
  await adminRemoveFieldFromCategory(categoryId, fieldId);
}

export async function adminFieldApplyToVertical(fieldId: number, isRequired: boolean) {
  const field = await adminFieldsGet(fieldId);
  await adminApplyFieldToAllCategoriesInVertical({
    fieldId,
    verticalSlug: field.vertical_slug,
    isRequired,
  });
  return { vertical: field.vertical_slug };
}
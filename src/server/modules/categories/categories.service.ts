//app/modules/categories/categories.service.ts
import { listCategoriesByVertical } from "./categories.repo";

export async function getCategories(vertical: string) {
  return listCategoriesByVertical(vertical);
}

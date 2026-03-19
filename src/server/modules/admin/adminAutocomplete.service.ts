import { AppError } from "@/src/server/shared/errors";

import { adminSearchVerticalSuggestions } from "./adminAutocomplete.repo";

export async function adminAutocompleteVerticals(query: string, limit = 8) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (normalizedQuery.length < 1) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 12);
  const results = await adminSearchVerticalSuggestions(normalizedQuery, safeLimit);

  return results.map((item) => ({
    id: item.value,
    value: item.value,
    label: item.value,
  }));
}

export function parseAutocompleteLimit(rawLimit: string | null) {
  if (!rawLimit) return 8;

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    throw new AppError("Limit invalido", 400);
  }

  return parsed;
}

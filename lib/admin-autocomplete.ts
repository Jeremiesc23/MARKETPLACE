export type AdminAutocompleteOption = {
  id: string;
  value: string;
  label: string;
  description?: string;
  meta?: string;
};

export async function fetchAdminVerticalSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<AdminAutocompleteOption[]> {
  const response = await fetch(
    `/api/admin/autocomplete/verticals?q=${encodeURIComponent(query)}`,
    {
      cache: "no-store",
      signal,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron cargar las sugerencias");
  }

  return Array.isArray(data.options) ? data.options : [];
}

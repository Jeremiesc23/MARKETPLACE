"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Category = {
  id: number;
  name: string;
  slug?: string;
};

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: unknown;
  constraints?: Record<string, unknown> | null;
  isRequired?: boolean;
};

type FiltersVariant = "sidebar" | "button";

const fieldLabelClass =
  "text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100";

const controlClassName =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const selectClassName =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 shadow-sm outline-none transition focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100";

function setParam(sp: URLSearchParams, key: string, value: string | null) {
  if (value == null || value.trim() === "") sp.delete(key);
  else sp.set(key, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArray<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.items)) return payload.items as T[];
  if (Array.isArray(payload.data)) return payload.data as T[];
  if (Array.isArray(payload.categories)) return payload.categories as T[];
  if (Array.isArray(payload.fields)) return payload.fields as T[];
  return [];
}

function parseFieldOptions(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((v) => String(v)).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      return input
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function niceDynLabel(key: string, value: string, fields: Field[]) {
  const raw = key.startsWith("a_") ? key.slice(2) : key;
  const base = raw.replace(/_(min|max)$/, "");
  const fieldLabel = fields.find((f) => f.key === base)?.label ?? base;

  if (raw.endsWith("_min")) return `${fieldLabel} >= ${value}`;
  if (raw.endsWith("_max")) return `${fieldLabel} <= ${value}`;
  if (value === "true") return fieldLabel;
  return `${fieldLabel}: ${value}`;
}

export default function PublicListingsFilters({
  variant = "sidebar",
}: {
  variant?: FiltersVariant;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [dynValues, setDynValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setCategoryId(searchParams.get("categoryId") ?? "");
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
    setSort(searchParams.get("sort") ?? "newest");

    const nextDyn: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("a_")) nextDyn[key] = value;
    }
    setDynValues(nextDyn);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const res = await fetch("/api/categories", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;

        const items = parseArray<Record<string, unknown>>(data).map((c) => ({
          id: Number(c.id),
          name: String(c.name ?? ""),
          slug: typeof c.slug === "string" ? c.slug : undefined,
        }));

        setCategories(items);
      } catch {
        if (!cancelled) setCategories([]);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFields() {
      if (!categoryId) {
        setFields([]);
        return;
      }

      setLoadingFields(true);
      try {
        const res = await fetch(`/api/categories/${categoryId}/fields`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled) {
          if (!cancelled) setFields([]);
          return;
        }

        const nextFields = parseArray<Record<string, unknown>>(data).map((f) => ({
          key: String(f.key),
          label: String(f.label ?? f.key),
          type: (f.type ?? "text") as Field["type"],
          options: f.options ?? null,
          constraints: isRecord(f.constraints) ? f.constraints : null,
          isRequired: Boolean(f.isRequired ?? f.is_required ?? false),
        }));

        setFields(nextFields);
      } catch {
        if (!cancelled) setFields([]);
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    }

    loadFields();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];

    if (q.trim()) items.push({ key: "q", label: `Buscar: ${q.trim()}` });

    if (categoryId) {
      const category = categories.find((c) => String(c.id) === categoryId);
      if (category) {
        items.push({ key: "categoryId", label: category.name });
      }
    }

    if (minPrice) items.push({ key: "minPrice", label: `Precio >= ${minPrice}` });
    if (maxPrice) items.push({ key: "maxPrice", label: `Precio <= ${maxPrice}` });
    if (sort && sort !== "newest") {
      const sortMap: Record<string, string> = {
        newest: "Más recientes",
        oldest: "Más antiguos",
        price_asc: "Precio menor",
        price_desc: "Precio mayor",
      };
      items.push({ key: "sort", label: sortMap[sort] ?? sort });
    }

    for (const [key, value] of Object.entries(dynValues)) {
      if (!value) continue;
      items.push({ key, label: niceDynLabel(key, value, fields) });
    }

    return items;
  }, [categories, categoryId, dynValues, fields, maxPrice, minPrice, q, sort]);

  function applyFilters() {
    const next = new URLSearchParams(searchParams.toString());

    setParam(next, "q", q);
    setParam(next, "categoryId", categoryId);
    setParam(next, "minPrice", minPrice);
    setParam(next, "maxPrice", maxPrice);
    setParam(next, "sort", sort === "newest" ? null : sort);

    next.delete("page");

    for (const key of Array.from(next.keys())) {
      if (key.startsWith("a_")) next.delete(key);
    }

    for (const [key, value] of Object.entries(dynValues)) {
      if (value?.trim()) next.set(key, value.trim());
    }

    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }

  function removeOneFilter(key: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(key);
    next.delete("page");

    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function renderDynamicField(field: Field) {
    const fieldKey = `a_${field.key}`;
    const value = dynValues[fieldKey] ?? "";

    if (field.type === "boolean") {
      return (
        <label
          key={field.key}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) =>
              setDynValues((prev) => ({
                ...prev,
                [fieldKey]: e.target.checked ? "true" : "",
              }))
            }
            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary/40"
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "select") {
      const options = parseFieldOptions(field.options);

      return (
        <div key={field.key} className="space-y-2">
          <label className={fieldLabelClass}>{field.label}</label>
          <select
            value={value}
            onChange={(e) =>
              setDynValues((prev) => ({
                ...prev,
                [fieldKey]: e.target.value,
              }))
            }
            className={selectClassName}
          >
            <option value="">Todos</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.key} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className={fieldLabelClass}>{field.label} mín.</label>
            <Input
              type="number"
              inputMode="decimal"
              value={dynValues[`a_${field.key}_min`] ?? ""}
              onChange={(e) =>
                setDynValues((prev) => ({
                  ...prev,
                  [`a_${field.key}_min`]: e.target.value,
                }))
              }
              placeholder="Mínimo"
              className={controlClassName}
            />
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass}>{field.label} máx.</label>
            <Input
              type="number"
              inputMode="decimal"
              value={dynValues[`a_${field.key}_max`] ?? ""}
              onChange={(e) =>
                setDynValues((prev) => ({
                  ...prev,
                  [`a_${field.key}_max`]: e.target.value,
                }))
              }
              placeholder="Máximo"
              className={controlClassName}
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <label className={fieldLabelClass}>{field.label}</label>
        <Input
          value={value}
          onChange={(e) =>
            setDynValues((prev) => ({
              ...prev,
              [fieldKey]: e.target.value,
            }))
          }
          placeholder={`Buscar por ${field.label.toLowerCase()}`}
          className={controlClassName}
        />
      </div>
    );
  }

  const filtersBody = (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        applyFilters();
      }}
    >
      <div className="space-y-2">
        <label className={fieldLabelClass}>Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título o palabra clave"
            className={`${controlClassName} pl-10`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass}>Categoría</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={selectClassName}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={fieldLabelClass}>Precio mínimo</label>
          <Input
            type="number"
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            className={controlClassName}
          />
        </div>
        <div className="space-y-2">
          <label className={fieldLabelClass}>Precio máximo</label>
          <Input
            type="number"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="1000"
            className={controlClassName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass}>Ordenar por</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={selectClassName}
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="price_asc">Precio menor</option>
          <option value="price_desc">Precio mayor</option>
        </select>
      </div>

      {(loadingFields || fields.length > 0) && (
        <>
          <Separator className="opacity-60 dark:opacity-20" />
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Filtros específicos
              </h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Se adaptan según la categoría seleccionada.
              </p>
            </div>

            {loadingFields ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                Cargando campos...
              </div>
            ) : (
              <div className="space-y-4">{fields.map(renderDynamicField)}</div>
            )}
          </div>
        </>
      )}

      {activeFilters.length > 0 && (
        <>
          <Separator className="opacity-60 dark:opacity-20" />
          <div className="space-y-3">
            <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Filtros activos
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilters.map((item) => (
                <button
                  key={`${item.key}-${item.label}`}
                  type="button"
                  onClick={() => removeOneFilter(item.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {item.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2 pt-2">
        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white shadow-lg shadow-zinc-900/15 transition hover:bg-zinc-800"
        >
          Aplicar filtros
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={clearAll}
          className="h-12 w-full rounded-xl border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Limpiar todo
        </Button>
      </div>
    </form>
  );

  if (variant === "button") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilters.length > 0 ? (
              <Badge className="ml-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
                {activeFilters.length}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-full max-w-full overflow-y-auto border-r-zinc-200 bg-white px-5 pb-8 pt-10 dark:border-white/10 dark:bg-zinc-950 sm:max-w-md"
        >
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Filtros de búsqueda
            </SheetTitle>
            <SheetDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              Ajusta categoría, precio y criterios para encontrar mejores resultados.
            </SheetDescription>
          </SheetHeader>
          {filtersBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="sticky top-24 overflow-hidden rounded-[1.5rem] border border-zinc-200/70 bg-white p-5 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-zinc-900/70">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Filtrar publicaciones
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Controla búsqueda, precio y categoría.
          </p>
        </div>
        {activeFilters.length > 0 ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-2 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {activeFilters.length}
          </span>
        ) : null}
      </div>

      {filtersBody}
    </Card>
  );
}

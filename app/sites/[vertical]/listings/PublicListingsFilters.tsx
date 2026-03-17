// app/sites/[vertical]/listings/PublicListingsFilters.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
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

function setParam(sp: URLSearchParams, key: string, value: string | null) {
  if (value == null || value.trim() === "") sp.delete(key);
  else sp.set(key, value);
}

function parseArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.fields)) return payload.fields;
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

  if (raw.endsWith("_min")) return `${fieldLabel} ≥ ${value}`;
  if (raw.endsWith("_max")) return `${fieldLabel} ≤ ${value}`;
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

        const items = parseArray<any>(data).map((c) => ({
          id: Number(c.id),
          name: String(c.name ?? ""),
          slug: c.slug ? String(c.slug) : undefined,
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

        const nextFields = parseArray<any>(data).map((f) => ({
          key: String(f.key),
          label: String(f.label ?? f.key),
          type: (f.type ?? "text") as Field["type"],
          options: f.options ?? null,
          constraints: f.constraints ?? null,
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

    if (minPrice) items.push({ key: "minPrice", label: `Precio ≥ ${minPrice}` });
    if (maxPrice) items.push({ key: "maxPrice", label: `Precio ≤ ${maxPrice}` });
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
          className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
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
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm font-medium text-zinc-700">{field.label}</span>
        </label>
      );
    }

    if (field.type === "select") {
      const options = parseFieldOptions(field.options);

      return (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">{field.label}</label>
          <select
            value={value}
            onChange={(e) =>
              setDynValues((prev) => ({
                ...prev,
                [fieldKey]: e.target.value,
              }))
            }
            className="flex h-12 w-full rounded-2xl border border-white/40 bg-white/60 px-4 text-sm font-medium text-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none ring-0 backdrop-blur-md transition-all focus:border-primary/50 focus:bg-white dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:focus:border-primary/50 dark:focus:bg-black/40"
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
            <label className="text-sm font-medium text-zinc-700">{field.label} mín.</label>
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
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{field.label} máx.</label>
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
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">{field.label}</label>
        <Input
          value={value}
          onChange={(e) =>
            setDynValues((prev) => ({
              ...prev,
              [fieldKey]: e.target.value,
            }))
          }
          placeholder={`Buscar por ${field.label.toLowerCase()}`}
        />
      </div>
    );
  }

  const filtersBody = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título o palabra clave"
            className="h-12 w-full !rounded-2xl !border-white/40 !bg-white/60 pl-11 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all focus:!bg-white dark:!border-white/10 dark:!bg-black/20 dark:focus:!bg-black/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Categoría</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex h-12 w-full rounded-2xl border border-white/40 bg-white/60 px-4 text-sm font-medium text-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none backdrop-blur-md transition-all focus:border-primary/50 focus:bg-white dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:focus:border-primary/50 dark:focus:bg-black/40"
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
          <label className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Temp. Min</label>
          <Input
            type="number"
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            className="h-12 !rounded-2xl !border-white/40 !bg-white/60 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all focus:!bg-white dark:!border-white/10 dark:!bg-black/20 dark:focus:!bg-black/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Temp. Max</label>
          <Input
            type="number"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="1000"
            className="h-12 !rounded-2xl !border-white/40 !bg-white/60 text-sm font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all focus:!bg-white dark:!border-white/10 dark:!bg-black/20 dark:focus:!bg-black/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Ordenar por</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="flex h-12 w-full rounded-2xl border border-white/40 bg-white/60 px-4 text-sm font-medium text-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none backdrop-blur-md transition-all focus:border-primary/50 focus:bg-white dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:focus:border-primary/50 dark:focus:bg-black/40"
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="price_asc">Precio menor</option>
          <option value="price_desc">Precio mayor</option>
        </select>
      </div>

      {(loadingFields || fields.length > 0) && (
        <>
          <Separator className="opacity-50 dark:opacity-20" />
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Filtros específicos
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Se ajustan por categoría
              </p>
            </div>

            {loadingFields ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                Cargando campos…
              </div>
            ) : (
              <div className="space-y-4">{fields.map(renderDynamicField)}</div>
            )}
          </div>
        </>
      )}

      {activeFilters.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-sm font-semibold tracking-tight text-zinc-900">
              Filtros activos
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilters.map((item) => (
                <button
                  key={`${item.key}-${item.label}`}
                  type="button"
                  onClick={() => removeOneFilter(item.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  {item.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-col gap-2.5 pt-2">
        <Button onClick={applyFilters} className="h-12 w-full rounded-2xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-lg dark:shadow-primary/10">
          Aplicar filtros
        </Button>
        <Button variant="outline" onClick={clearAll} className="h-12 w-full rounded-2xl border-white/50 bg-white/50 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-800">
          Limpiar todo
        </Button>
      </div>
    </div>
  );

  if (variant === "button") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilters.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {activeFilters.length}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-x-0 border-b-0 bg-white p-5"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          {filtersBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="sticky top-24 overflow-hidden rounded-3xl border border-white/50 bg-white/40 p-6 shadow-xl shadow-black/5 ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 dark:shadow-black/50">
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/0 pointer-events-none dark:from-white/5" />
      <div className="relative z-10">{filtersBody}</div>
    </Card>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type Category = { id: number; name: string; slug: string };
type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: any;
  constraints?: any;
  isRequired?: boolean;
};

type FiltersVariant = "sidebar" | "button";

function setParam(sp: URLSearchParams, key: string, value: string | null) {
  if (value == null || value === "") sp.delete(key);
  else sp.set(key, value);
}

function niceDynLabel(key: string, value: string, fields: Field[]) {
  const raw = key.startsWith("a_") ? key.slice(2) : key; // ej: color, precio_min
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
  const search = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  // core
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  // dyn params (a_key, a_key_min, a_key_max)
  const [dynParams, setDynParams] = useState<Record<string, string>>({});

  const [open, setOpen] = useState(false);

  // sync URL -> state
  useEffect(() => {
    setQ(search.get("q") ?? "");
    setCategoryId(search.get("categoryId") ?? "");
    setMinPrice(search.get("minPrice") ?? "");
    setMaxPrice(search.get("maxPrice") ?? "");
    setSort(search.get("sort") ?? "newest");

    const d: Record<string, string> = {};
    for (const [k, v] of search.entries()) {
      if (k.startsWith("a_")) d[k] = v;
    }
    setDynParams(d);
  }, [search]);

  // cargar categorías
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.categories)) setCategories(json.categories);
      } catch {
        // ignore
      }
    })();
  }, []);

  // cargar fields de categoría
  useEffect(() => {
    (async () => {
      if (!categoryId) {
        setFields([]);
        return;
      }
      try {
        const res = await fetch(`/api/categories/${categoryId}/fields`, { cache: "no-store" });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.fields)) setFields(json.fields);
        else setFields([]);
      } catch {
        setFields([]);
      }
    })();
  }, [categoryId]);

  const optionList = (f: Field): Array<{ value: string; label: string }> => {
    const opts = f.options;
    if (Array.isArray(opts)) {
      return opts.map((o: any) =>
        typeof o === "string"
          ? { value: o, label: o }
          : { value: String(o.value), label: String(o.label ?? o.value) }
      );
    }
    return [];
  };

  function apply() {
    const sp = new URLSearchParams(search.toString());

    setParam(sp, "q", q.trim() || null);
    setParam(sp, "categoryId", categoryId || null);
    setParam(sp, "minPrice", minPrice || null);
    setParam(sp, "maxPrice", maxPrice || null);
    setParam(sp, "sort", sort || "newest");

    // reset page
    sp.set("page", "1");

    // limpia dyn previos
    for (const k of Array.from(sp.keys())) {
      if (k.startsWith("a_")) sp.delete(k);
    }

    // set dyn actuales
    for (const [k, v] of Object.entries(dynParams)) {
      if (!k.startsWith("a_")) continue;
      if (!v) continue;
      sp.set(k, v);
    }

    router.push(`?${sp.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    router.push("?");
    setOpen(false);
  }

  function removeKeys(keys: string[]) {
    const sp = new URLSearchParams(search.toString());
    keys.forEach((k) => sp.delete(k));
    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; remove: () => void }> = [];

    const qv = search.get("q");
    if (qv) chips.push({ id: "q", label: `Buscar: ${qv}`, remove: () => removeKeys(["q"]) });

    const cat = search.get("categoryId");
    if (cat) {
      const name = categories.find((c) => String(c.id) === String(cat))?.name ?? `Cat ${cat}`;
      chips.push({ id: "categoryId", label: `Categoría: ${name}`, remove: () => removeKeys(["categoryId"]) });
    }

    const min = search.get("minPrice");
    const max = search.get("maxPrice");
    if (min || max) chips.push({ id: "price", label: `Precio: ${min || "0"}–${max || "∞"}`, remove: () => removeKeys(["minPrice","maxPrice"]) });

    const s = search.get("sort");
    if (s && s !== "newest") {
      const label = s === "price_asc" ? "Orden: Precio ↑" : s === "price_desc" ? "Orden: Precio ↓" : "Orden: Relevancia";
      chips.push({ id: "sort", label, remove: () => removeKeys(["sort"]) });
    }

    for (const [k, v] of Object.entries(dynParams)) {
      chips.push({ id: k, label: niceDynLabel(k, v, fields), remove: () => removeKeys([k]) });
    }

    return chips;
  }, [search, categories, dynParams, fields]);

  const FiltersBody = (
    <div className="space-y-4">
      {activeChips.length ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <Badge
              key={c.id}
              variant="secondary"
              className="rounded-full cursor-pointer"
              onClick={c.remove}
              title="Quitar filtro"
            >
              {c.label} ✕
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Buscar</div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Buscar…"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Categoría</div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
        >
          <option value="">(Todas)</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Precio</div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Mín"
            inputMode="numeric"
            className="rounded-xl"
          />
          <Input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Máx"
            inputMode="numeric"
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Ordenar</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
        >
          <option value="newest">Más nuevos</option>
          <option value="price_asc">Precio ↑</option>
          <option value="price_desc">Precio ↓</option>
          <option value="relevance">Relevancia</option>
        </select>
      </div>

      {fields.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-sm font-semibold tracking-tight">Filtros de categoría</div>

            {fields.map((f) => {
              const key = f.key;

              if (f.type === "number") {
                const kMin = `a_${key}_min`;
                const kMax = `a_${key}_max`;
                return (
                  <div key={key} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={dynParams[kMin] ?? ""}
                        onChange={(e) => setDynParams((d) => ({ ...d, [kMin]: e.target.value }))}
                        placeholder="Min"
                        className="rounded-xl"
                      />
                      <Input
                        value={dynParams[kMax] ?? ""}
                        onChange={(e) => setDynParams((d) => ({ ...d, [kMax]: e.target.value }))}
                        placeholder="Max"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                );
              }

              if (f.type === "boolean") {
                const k = `a_${key}`;
                const checked = (dynParams[k] ?? "") === "true";
                return (
                  <label key={key} className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setDynParams((d) => {
                          const next = { ...d };
                          if (e.target.checked) next[k] = "true";
                          else delete next[k];
                          return next;
                        })
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{f.label}</span>
                  </label>
                );
              }

              if (f.type === "select") {
                const k = `a_${key}`;
                const opts = optionList(f);
                return (
                  <div key={key} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                    <select
                      value={dynParams[k] ?? ""}
                      onChange={(e) => setDynParams((d) => ({ ...d, [k]: e.target.value }))}
                      className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="">(cualquiera)</option>
                      {opts.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              // text
              const k = `a_${key}`;
              return (
                <div key={key} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                  <Input
                    value={dynParams[k] ?? ""}
                    onChange={(e) => setDynParams((d) => ({ ...d, [k]: e.target.value }))}
                    placeholder="Valor…"
                    className="rounded-xl"
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="flex gap-2">
        <Button className="flex-1 rounded-xl" onClick={apply}>
          Aplicar
        </Button>
        <Button variant="secondary" className="rounded-xl" onClick={clearAll}>
          Limpiar
        </Button>
      </div>
    </div>
  );

  // Mobile button -> Sheet
  if (variant === "button") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" className="rounded-xl">
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{FiltersBody}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <Card className="rounded-2xl border bg-card p-4 sticky top-20">
      <div className="mb-3 text-sm font-semibold tracking-tight">Filtros</div>
      {FiltersBody}
    </Card>
  );
}
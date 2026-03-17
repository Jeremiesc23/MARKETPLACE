//app/sites/[vertical]/components/PublicAttributesBlock.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: unknown;
  constraints?: unknown;
  isRequired?: boolean;
  sortOrder?: number;
};

function parseMaybeJson(v: unknown) {
  if (typeof v !== "string") return v;

  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function extractFields(payload: any): Field[] {
  const arr =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.fields) && payload.fields) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return arr.map((f: any) => ({
    key: String(f.key),
    label: String(f.label ?? f.key),
    type: (f.type ?? "text") as Field["type"],
    options: parseMaybeJson(f.options) ?? null,
    constraints: parseMaybeJson(f.constraints) ?? null,
    isRequired: Boolean(f.isRequired ?? f.is_required ?? false),
    sortOrder: Number(f.sortOrder ?? f.sort_order ?? 0),
  }));
}

function formatValue(field: Field, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (field.type === "boolean") return Boolean(value) ? "Sí" : "No";
  return String(value);
}

export default function PublicAttributesBlock({
  categoryId,
  attributes,
}: {
  categoryId: number | null;
  attributes: Record<string, unknown> | null;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!categoryId) {
        setFields([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/categories/${categoryId}/fields`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || data?.error || `Error ${res.status}`);
        }

        const nextFields = extractFields(data).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

        if (!cancelled) setFields(nextFields);
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los detalles";

        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const rows = useMemo(() => {
    const attrs = attributes || {};

    return fields
      .map((f) => {
        const value = formatValue(f, attrs[f.key]);
        if (value == null) return null;
        return { label: f.label, value };
      })
      .filter(Boolean) as Array<{ label: string; value: string }>;
  }, [fields, attributes]);

  if (!categoryId) return null;

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando detalles…</div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md transition-all hover:bg-white/80 dark:border-white/5 dark:bg-black/20 dark:ring-white/5 dark:hover:bg-zinc-900/50"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/50 to-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            {row.label}
          </dt>
          <dd className="mt-1.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
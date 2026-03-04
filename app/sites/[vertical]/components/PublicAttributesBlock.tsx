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
      if (!categoryId) return;

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
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "No se pudieron cargar los detalles");
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
        const v = formatValue(f, attrs[f.key]);
        if (v == null) return null;
        return { label: f.label, value: v };
      })
      .filter(Boolean) as { label: string; value: string }[];
  }, [fields, attributes]);

  if (!categoryId) return null;
  if (loading) return <p style={{ opacity: 0.7 }}>Cargando detalles…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (rows.length === 0) return null;

  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Detalles</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {rows.map((r) => (
          <li key={r.label}>
            <strong>{r.label}:</strong> {r.value}
          </li>
        ))}
      </ul>
    </section>
  );
}
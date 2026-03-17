// app/dashboard/listings/_components/DynamicFieldsForm.tsx
"use client";

import { Input } from "@/components/ui/input";

export type DynamicField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: unknown;
  constraints?: unknown;
  isRequired?: boolean;
  sortOrder?: number;
};

type Props = {
  fields: DynamicField[];
  attributes: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
};

type SelectOption = {
  value: string;
  label: string;
};

function normalizeOptions(options: unknown): SelectOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((opt): SelectOption | null => {
      if (typeof opt === "string" || typeof opt === "number") {
        const v = String(opt);
        return { value: v, label: v };
      }

      if (opt && typeof opt === "object") {
        const optionRecord = opt as Record<string, unknown>;
        const value =
          optionRecord["value"] ??
          optionRecord["key"] ??
          optionRecord["id"] ??
          optionRecord["label"];
        const label =
          optionRecord["label"] ??
          optionRecord["name"] ??
          optionRecord["value"] ??
          optionRecord["key"] ??
          optionRecord["id"];

        if (value === undefined || label === undefined) return null;

        return {
          value: String(value),
          label: String(label),
        };
      }

      return null;
    })
    .filter(Boolean) as SelectOption[];
}

function getMinMax(constraints: unknown): { min?: number; max?: number } {
  if (!constraints || typeof constraints !== "object") return {};

  const constraintRecord = constraints as Record<string, unknown>;
  const rawMin = constraintRecord["min"];
  const rawMax = constraintRecord["max"];

  const min =
    rawMin !== undefined && rawMin !== null && rawMin !== ""
      ? Number(rawMin)
      : undefined;

  const max =
    rawMax !== undefined && rawMax !== null && rawMax !== ""
      ? Number(rawMax)
      : undefined;

  return {
    min: Number.isFinite(min as number) ? min : undefined,
    max: Number.isFinite(max as number) ? max : undefined,
  };
}

function setAttribute(
  current: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> {
  return {
    ...current,
    [key]: value,
  };
}

export default function DynamicFieldsForm({
  fields,
  attributes,
  onChange,
  disabled,
}: Props) {
  const sortedFields = [...fields].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  if (!sortedFields.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/80 p-5 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
        Esta categoria no tiene campos dinamicos.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sortedFields.map((field) => {
        const value = attributes[field.key];
        const { min, max } = getMinMax(field.constraints);
        const labelText = `${field.label}${field.isRequired ? " *" : ""}`;
        const hint =
          min !== undefined || max !== undefined
            ? `${min !== undefined ? `Min ${min}` : ""}${min !== undefined && max !== undefined ? " / " : ""}${max !== undefined ? `Max ${max}` : ""}`
            : null;

        if (field.type === "select") {
          const options = normalizeOptions(field.options);

          return (
            <div
              key={field.key}
              className="rounded-[1.5rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <label
                htmlFor={`attr-${field.key}`}
                className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white"
              >
                {labelText}
              </label>
              <select
                id={`attr-${field.key}`}
                value={value == null ? "" : String(value)}
                onChange={(e) =>
                  onChange(setAttribute(attributes, field.key, e.target.value || null))
                }
                disabled={disabled}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              >
                <option value="">Selecciona una opcion</option>
                {options.map((opt) => (
                  <option key={`${field.key}-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Elige la opcion que mejor describa este atributo.
              </p>
            </div>
          );
        }

        if (field.type === "number") {
          return (
            <div
              key={field.key}
              className="rounded-[1.5rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <label
                htmlFor={`attr-${field.key}`}
                className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white"
              >
                {labelText}
              </label>
              <Input
                id={`attr-${field.key}`}
                type="number"
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) =>
                  onChange(
                    setAttribute(
                      attributes,
                      field.key,
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  )
                }
                min={min}
                max={max}
                disabled={disabled}
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {hint ?? "Ingresa un valor numerico para este campo."}
              </p>
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <div
              key={field.key}
              className="rounded-[1.5rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm md:col-span-2 dark:border-white/10 dark:bg-white/5"
            >
              <label
                htmlFor={`attr-${field.key}`}
                className="flex cursor-pointer items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {labelText}
                  </div>
                  <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    Activalo si este atributo aplica a la publicacion.
                  </p>
                </div>

                <span className="relative inline-flex items-center">
                  <input
                    id={`attr-${field.key}`}
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) =>
                      onChange(setAttribute(attributes, field.key, e.target.checked))
                    }
                    disabled={disabled}
                    className="peer sr-only"
                  />
                  <span className="h-7 w-12 rounded-full bg-zinc-200 transition peer-checked:bg-zinc-900 peer-disabled:opacity-50 dark:bg-white/10 dark:peer-checked:bg-white" />
                  <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 dark:bg-zinc-900 dark:peer-checked:bg-zinc-900" />
                </span>
              </label>
            </div>
          );
        }

        return (
          <div
            key={field.key}
            className="rounded-[1.5rem] border border-zinc-200/80 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <label
              htmlFor={`attr-${field.key}`}
              className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white"
            >
              {labelText}
            </label>
            <Input
              id={`attr-${field.key}`}
              type="text"
              value={value == null ? "" : String(value)}
              onChange={(e) =>
                onChange(setAttribute(attributes, field.key, e.target.value || null))
              }
              disabled={disabled}
            />
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Usa un valor corto y facil de entender.
            </p>
          </div>
        );
      })}
    </div>
  );
}
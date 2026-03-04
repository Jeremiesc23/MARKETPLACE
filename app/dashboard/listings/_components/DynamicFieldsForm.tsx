// app/dashboard/listings/_components/DynamicFieldsForm.tsx
"use client";

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
        const anyOpt = opt as any;
        const value = anyOpt.value ?? anyOpt.key ?? anyOpt.id ?? anyOpt.label;
        const label = anyOpt.label ?? anyOpt.name ?? anyOpt.value ?? anyOpt.key ?? anyOpt.id;

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

  const c = constraints as any;

  const min =
    c.min !== undefined && c.min !== null && c.min !== ""
      ? Number(c.min)
      : undefined;

  const max =
    c.max !== undefined && c.max !== null && c.max !== ""
      ? Number(c.max)
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
    return <p style={{ margin: 0, opacity: 0.8 }}>Esta categoría no tiene campos dinámicos.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sortedFields.map((field) => {
        const value = attributes[field.key];
        const { min, max } = getMinMax(field.constraints);
        const labelText = `${field.label}${field.isRequired ? " *" : ""}`;

        if (field.type === "select") {
          const options = normalizeOptions(field.options);

          return (
            <div key={field.key}>
              <label htmlFor={`attr-${field.key}`} style={{ display: "block", marginBottom: 4 }}>
                {labelText}
              </label>
              <select
                id={`attr-${field.key}`}
                value={value == null ? "" : String(value)}
                onChange={(e) =>
                  onChange(setAttribute(attributes, field.key, e.target.value || null))
                }
                disabled={disabled}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">Selecciona una opción</option>
                {options.map((opt) => (
                  <option key={`${field.key}-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "number") {
          return (
            <div key={field.key}>
              <label htmlFor={`attr-${field.key}`} style={{ display: "block", marginBottom: 4 }}>
                {labelText}
              </label>
              <input
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
                style={{ width: "100%", padding: 8 }}
              />
              {(min !== undefined || max !== undefined) && (
                <small style={{ opacity: 0.8 }}>
                  {min !== undefined ? `min: ${min}` : ""}
                  {min !== undefined && max !== undefined ? " · " : ""}
                  {max !== undefined ? `max: ${max}` : ""}
                </small>
              )}
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <div key={field.key}>
              <label
                htmlFor={`attr-${field.key}`}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  id={`attr-${field.key}`}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) =>
                    onChange(setAttribute(attributes, field.key, e.target.checked))
                  }
                  disabled={disabled}
                />
                <span>{labelText}</span>
              </label>
            </div>
          );
        }

        // default: text
        return (
          <div key={field.key}>
            <label htmlFor={`attr-${field.key}`} style={{ display: "block", marginBottom: 4 }}>
              {labelText}
            </label>
            <input
              id={`attr-${field.key}`}
              type="text"
              value={value == null ? "" : String(value)}
              onChange={(e) =>
                onChange(setAttribute(attributes, field.key, e.target.value || null))
              }
              disabled={disabled}
              style={{ width: "100%", padding: 8 }}
            />
          </div>
        );
      })}
    </div>
  );
}
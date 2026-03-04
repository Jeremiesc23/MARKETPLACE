import { AppError } from "@/src/server/shared/errors";

type AllowedField = {
  key: string;
  type: "text" | "number" | "boolean" | "select";
  options: any[] | null;
  constraints: any | null;
  isRequired: boolean;
};

export function sanitizeAndValidateAttributes(
  input: any,
  allowedFields: AllowedField[],
  { requireAllRequired = false }: { requireAllRequired?: boolean } = {}
) {
  if (input == null) input = {};
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("attributes debe ser un objeto", 400);
  }

  const allowedByKey = new Map(allowedFields.map((f) => [f.key, f]));
  const out: Record<string, any> = {};

  // 1) no permitir keys desconocidas
  for (const key of Object.keys(input)) {
    const def = allowedByKey.get(key);
    if (!def) throw new AppError(`Campo no permitido: ${key}`, 400);

    const v = input[key];

    // 2) validar por tipo
    if (def.type === "number") {
      if (typeof v !== "number") throw new AppError(`Campo ${key} debe ser número`, 400);
      const min = def.constraints?.min;
      const max = def.constraints?.max;
      if (min != null && v < min) throw new AppError(`${key} mínimo ${min}`, 400);
      if (max != null && v > max) throw new AppError(`${key} máximo ${max}`, 400);
    }

    if (def.type === "text") {
      if (typeof v !== "string") throw new AppError(`Campo ${key} debe ser texto`, 400);
    }

    if (def.type === "boolean") {
      if (typeof v !== "boolean") throw new AppError(`Campo ${key} debe ser boolean`, 400);
    }

    if (def.type === "select") {
      if (typeof v !== "string") throw new AppError(`Campo ${key} debe ser string`, 400);
      const opts = def.options ?? [];
      if (!opts.includes(v)) throw new AppError(`Valor inválido para ${key}`, 400);
    }

    out[key] = v;
  }

  // 3) required (recomendado exigir SOLO en publish)
  if (requireAllRequired) {
    for (const f of allowedFields) {
      const v = out[f.key];
      if (f.isRequired && (v === undefined || v === null || v === "")) {
        throw new AppError(`Falta campo requerido: ${f.key}`, 400);
      }
    }
  }

  return out;
}
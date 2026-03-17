//app/dashboard/listings/new/ui.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsForm, { type DynamicField } from "../_components/DynamicFieldsForm";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { EditorShell } from "../_components/EditorShell";
import { EditorSection } from "../_components/EditorSection";
import { EditorStepper } from "../_components/EditorStepper";
import { EditorMobileActions } from "../_components/EditorMobileActions";
// ✅ Reglas por vertical (lo que ya creaste)
import {
  verticalFormConfig,
  defaultVerticalRules,
  type VerticalFormRules,
} from "@/src/server/shared/verticalFormConfig";

type Category = {
  id: number;
  name: string;
  slug?: string;
};

type ListingFormState = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  locationText: string;
  attributes: Record<string, unknown>;
};

function extractArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.fields)) return payload.fields;
  return [];
}

function normalizeFields(payload: any): DynamicField[] {
  const raw = extractArray<any>(payload);

  return raw
    .map((f) => ({
      key: String(f.key),
      label: String(f.label ?? f.key),
      type: (f.type ?? "text") as DynamicField["type"],
      options: f.options ?? null,
      constraints: f.constraints ?? null,
      isRequired: Boolean(f.isRequired ?? f.is_required ?? false),
      sortOrder: Number(f.sortOrder ?? f.sort_order ?? 0),
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function getErrorMessage(res: Response) {
  const data = await safeJson(res);
  return (
    data?.error ||
    data?.message ||
    (typeof data === "string" ? data : null) ||
    `Error ${res.status}`
  );
}

function isEmptyValue(v: unknown) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// ✅ ahora valida también ubicación según rules
function validateStep(
  step: number,
  form: ListingFormState,
  fields: DynamicField[],
  rules: VerticalFormRules
) {
  if (step === 0) {
    if (!form.categoryId) return "Selecciona una categoría";
    if (!form.title.trim()) return "Escribe un título";
  }
  if (step === 1) {
    // Ubicación según vertical
    if (rules.requireLocation && !form.locationText.trim()) {
      return "Completa: Ubicación";
    }

    // Valida required dinámicos (si existen)
    const required = fields.filter((f) => f.isRequired);
    for (const f of required) {
      const val = form.attributes?.[f.key];
      if (isEmptyValue(val)) return `Completa: ${f.label}`;
    }

    // precio: opcional, pero si existe debe ser válido
    if (form.price.trim() !== "") {
      const n = Number(form.price);
      if (!Number.isFinite(n) || n < 0) return "El precio no es válido";
    }
    if (form.currency.trim().length !== 3)
      return "La moneda debe tener 3 letras (ej: USD)";
  }
  return null;
}

function StepPill({
  active,
  done,
  label,
}: {
  active?: boolean;
  done?: boolean;
  label: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        active
          ? "border-foreground/20 bg-muted text-foreground"
          : "border-border text-muted-foreground",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
          done ? "bg-foreground text-background" : "bg-muted text-foreground",
        ].join(" ")}
      >
        {done ? "✓" : "•"}
      </span>
      {label}
    </div>
  );
}

export default function NewListingFormPage() {
  const router = useRouter();

  const [step, setStep] = useState(0); // 0 básico, 1 detalles, 2 confirmar

  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<DynamicField[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<ListingFormState>({
    categoryId: "",
    title: "",
    description: "",
    price: "",
    currency: "USD",
    locationText: "",
    attributes: {},
  });

  // ✅ vertical del tenant (viene de GET /api/categories)
  const [vertical, setVertical] = useState<string>("");
  const rules = useMemo(
    () => verticalFormConfig[vertical] ?? defaultVerticalRules,
    [vertical]
  );

  const selectedCategoryId = useMemo(
    () => Number(form.categoryId) || null,
    [form.categoryId]
  );

  const selectedCategory = useMemo(
    () =>
      categories.find((c) => String(c.id) === String(form.categoryId)) ?? null,
    [categories, form.categoryId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setPageError(null);

      try {
        const res = await fetch("/api/categories", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await getErrorMessage(res));

        const data = await safeJson(res);

        // ✅ guarda vertical para aplicar reglas
        if (!cancelled) setVertical(String(data?.vertical ?? ""));

        const items = extractArray<Category>(data).map((c: any) => ({
          id: Number(c.id),
          name: String(c.name),
          slug: c.slug ? String(c.slug) : undefined,
        }));

        if (!cancelled) setCategories(items);
      } catch (err: any) {
        if (!cancelled)
          setPageError(
            err?.message ?? "No se pudieron cargar las categorías"
          );
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFields(categoryId: number) {
      setLoadingFields(true);
      setPageError(null);

      try {
        const res = await fetch(`/api/categories/${categoryId}/fields`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!res.ok) throw new Error(await getErrorMessage(res));

        const data = await safeJson(res);
        const nextFields = normalizeFields(data);

        if (!cancelled) {
          setFields(nextFields);
          setForm((prev) => ({ ...prev, attributes: {} })); // limpia al cambiar categoría
        }
      } catch (err: any) {
        if (!cancelled) {
          setFields([]);
          setPageError(err?.message ?? "No se pudieron cargar los campos");
        }
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    }

    if (!selectedCategoryId) {
      setFields([]);
      return;
    }

    loadFields(selectedCategoryId);

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  async function createDraft() {
    setSubmitError(null);
    setSubmitting(true);

    try {
      // ✅ si no se muestra ubicación, no mandamos nada
      const locationValue = rules.showLocation
        ? form.locationText.trim() || null
        : null;

      const payload = {
        categoryId: Number(form.categoryId),
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price.trim() === "" ? null : Number(form.price),
        currency: (form.currency || "USD").trim().toUpperCase(),
        locationText: locationValue,
        attributes: form.attributes,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      const data = await safeJson(res);
      const newId =
        data?.id ?? data?.listing?.id ?? data?.data?.id ?? data?.item?.id;

      if (newId) {
        router.push(`/dashboard/listings/${newId}/edit`);
      } else {
        router.push("/dashboard/listings");
      }
      router.refresh();
    } catch (err: any) {
      setSubmitError(err?.message ?? "No se pudo guardar el draft");
    } finally {
      setSubmitting(false);
    }
  }

  function onNext() {
    setPageError(null);
    setSubmitError(null);

    const err = validateStep(step, form, fields, rules);
    if (err) {
      setSubmitError(err);
      return;
    }
    setStep((s) => Math.min(2, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onBack() {
    setSubmitError(null);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancel() {
    router.push("/dashboard/listings");
  }

  return (
    <>
  <PageHeader
    title="Nueva publicación"
    description="Crea una publicación clara, ordenada y fácil de gestionar."
  />

  <EditorStepper
    currentStep={step}
    steps={[
      { label: "Básico" },
      { label: "Detalles" },
      { label: "Confirmar" },
    ]}
  />

  <EditorShell
    sidebar={
      <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Resumen</div>
            <p className="mt-1 text-sm text-zinc-500">
              Revisa la información antes de continuar.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Categoría</span>
              <span className="font-medium text-zinc-900">
                {selectedCategory?.name ?? "Sin elegir"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Título</span>
              <span className="max-w-[180px] truncate font-medium text-zinc-900">
                {form.title || "Sin título"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Precio</span>
              <span className="font-medium text-zinc-900">
                {form.price ? `${form.price} ${form.currency}` : "No definido"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    }
  >
    <EditorSection
      title="Información básica"
      description="Define la categoría, el título y la descripción principal."
    >
      {/* aquí va tu bloque actual de categoría, título y descripción */}
    </EditorSection>

    <EditorSection
      title="Detalles"
      description="Completa ubicación, precio y atributos dinámicos."
    >
      {/* aquí va tu bloque actual de precio, currency, locationText y DynamicFieldsForm */}
    </EditorSection>

    <EditorSection
      title="Confirmación"
      description="Haz una última revisión antes de guardar."
    >
      {/* aquí va tu resumen final o mensaje de confirmación */}
    </EditorSection>
  </EditorShell>

  <EditorMobileActions>
    <Button variant="outline" className="flex-1">
      Atrás
    </Button>
    <Button className="flex-1">
      Continuar
    </Button>
  </EditorMobileActions>
</>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsForm, { type DynamicField } from "../_components/DynamicFieldsForm";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { EditorShell } from "../_components/EditorShell";
import { EditorSection } from "../_components/EditorSection";
import { EditorStepper } from "../_components/EditorStepper";
import { EditorMobileActions } from "../_components/EditorMobileActions";
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

function extractArray<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as { items?: unknown[] })?.items)) {
    return (payload as { items: T[] }).items;
  }
  if (Array.isArray((payload as { data?: unknown[] })?.data)) {
    return (payload as { data: T[] }).data;
  }
  if (Array.isArray((payload as { categories?: unknown[] })?.categories)) {
    return (payload as { categories: T[] }).categories;
  }
  if (Array.isArray((payload as { fields?: unknown[] })?.fields)) {
    return (payload as { fields: T[] }).fields;
  }
  return [];
}

function normalizeFields(payload: unknown): DynamicField[] {
  const raw = extractArray<Record<string, unknown>>(payload);

  return raw
    .map((field) => ({
      key: String(field.key),
      label: String(field.label ?? field.key),
      type: (field.type ?? "text") as DynamicField["type"],
      options: field.options ?? null,
      constraints: field.constraints ?? null,
      isRequired: Boolean(field.isRequired ?? field.is_required ?? false),
      sortOrder: Number(field.sortOrder ?? field.sort_order ?? 0),
    }))
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
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

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateStep(
  step: number,
  form: ListingFormState,
  fields: DynamicField[],
  rules: VerticalFormRules
) {
  if (step === 0) {
    if (!form.categoryId) return "Selecciona una categoria";
    if (!form.title.trim()) return "Escribe un titulo";
  }

  if (step === 1) {
    if (rules.requireLocation && !form.locationText.trim()) {
      return "Completa la ubicacion";
    }

    const requiredFields = fields.filter((field) => field.isRequired);
    for (const field of requiredFields) {
      const value = form.attributes?.[field.key];
      if (isEmptyValue(value)) return `Completa: ${field.label}`;
    }

    if (form.price.trim() !== "") {
      const numericPrice = Number(form.price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return "El precio no es valido";
      }
    }

    if (form.currency.trim().length !== 3) {
      return "La moneda debe tener 3 letras";
    }
  }

  return null;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[220px] text-right font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100">
      {message}
    </Card>
  );
}

export default function NewListingFormPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
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

  const [vertical, setVertical] = useState("");
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
      categories.find((category) => String(category.id) === String(form.categoryId)) ??
      null,
    [categories, form.categoryId]
  );

  const filledAttributes = useMemo(() => {
    return Object.entries(form.attributes).filter(([, value]) => !isEmptyValue(value));
  }, [form.attributes]);

  const isBusy = loadingCategories || loadingFields || submitting;

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
        if (!cancelled) setVertical(String(data?.vertical ?? ""));

        const items = extractArray<Record<string, unknown>>(data).map((category) => ({
          id: Number(category.id),
          name: String(category.name),
          slug: category.slug ? String(category.slug) : undefined,
        }));

        if (!cancelled) setCategories(items);
      } catch (error: unknown) {
        if (cancelled) return;
        setPageError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las categorias"
        );
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    void loadCategories();

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
          setForm((previous) => ({ ...previous, attributes: {} }));
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setFields([]);
          setPageError(
            error instanceof Error ? error.message : "No se pudieron cargar los campos"
          );
        }
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    }

    if (!selectedCategoryId) {
      setFields([]);
      return;
    }

    void loadFields(selectedCategoryId);

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  async function createDraft() {
    setSubmitError(null);
    setSubmitting(true);

    try {
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
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo guardar el borrador"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onNext() {
    setPageError(null);
    setSubmitError(null);

    const nextError = validateStep(step, form, fields, rules);
    if (nextError) {
      setSubmitError(nextError);
      return;
    }

    setStep((currentStep) => Math.min(2, currentStep + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onBack() {
    setSubmitError(null);
    setStep((currentStep) => Math.max(0, currentStep - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancel() {
    router.push("/dashboard/listings");
  }

  const primaryButton =
    step < 2 ? (
      <Button onClick={onNext} disabled={isBusy}>
        Continuar
      </Button>
    ) : (
      <Button onClick={() => void createDraft()} disabled={isBusy}>
        {submitting ? "Creando..." : "Crear borrador"}
      </Button>
    );

  return (
    <div className="pb-32 md:pb-8">
      <PageHeader
        title="Nueva publicacion"
        description="Crea un borrador claro y luego pasa al editor completo para subir fotos y publicar."
      />

      <EditorStepper
        currentStep={step}
        steps={[
          { label: "Basico" },
          { label: "Detalles" },
          { label: "Confirmar" },
        ]}
      />

      <div className="mt-6 grid gap-3">
        {pageError ? <ErrorCard message={pageError} /> : null}
        {submitError ? <ErrorCard message={submitError} /> : null}
      </div>

      <div className="mt-6">
        <EditorShell
          sidebar={
            <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
              <div className="space-y-4 p-5">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Resumen
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Revisa lo esencial antes de avanzar al siguiente paso.
                  </p>
                </div>

                <div className="space-y-3">
                  <SummaryRow
                    label="Categoria"
                    value={selectedCategory?.name ?? "Sin elegir"}
                  />
                  <SummaryRow
                    label="Titulo"
                    value={form.title.trim() || "Sin titulo"}
                  />
                  <SummaryRow
                    label="Precio"
                    value={
                      form.price.trim()
                        ? `${form.price} ${form.currency}`
                        : "No definido"
                    }
                  />
                  {rules.showLocation ? (
                    <SummaryRow
                      label="Ubicacion"
                      value={form.locationText.trim() || "No definida"}
                    />
                  ) : null}
                </div>
              </div>
            </Card>
          }
        >
          {step === 0 ? (
            <EditorSection
              title="Informacion basica"
              description="Selecciona la categoria y redacta la base de la publicacion."
            >
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="categoryId">
                    Categoria
                  </label>
                  <select
                    id="categoryId"
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        categoryId: event.target.value,
                      }))
                    }
                    disabled={loadingCategories || submitting}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                  >
                    <option value="">
                      {loadingCategories ? "Cargando categorias..." : "Selecciona una categoria"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    La categoria define que campos dinamicos se cargan en el paso 2.
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="title">
                    Titulo
                  </label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Ej: Serum facial hidratante"
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="description">
                    Descripcion
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe el producto, su estado y lo mas importante para el cliente."
                    disabled={submitting}
                    className="min-h-[160px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                  />
                </div>
              </div>
            </EditorSection>
          ) : null}

          {step === 1 ? (
            <EditorSection
              title="Detalles"
              description="Completa precio, ubicacion y atributos dinamicos antes de crear el borrador."
            >
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="price">
                      Precio
                    </label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          price: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="currency">
                      Moneda
                    </label>
                    <Input
                      id="currency"
                      maxLength={3}
                      value={form.currency}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          currency: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="USD"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {rules.showLocation ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="locationText">
                      Ubicacion
                    </label>
                    <Input
                      id="locationText"
                      value={form.locationText}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          locationText: event.target.value,
                        }))
                      }
                      placeholder="Ej: Colonia Escalon, San Salvador"
                      disabled={submitting}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {rules.requireLocation
                        ? "Este vertical requiere ubicacion."
                        : "Opcional para este vertical."}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Campos dinamicos
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Se cargan segun la categoria seleccionada en el paso anterior.
                    </p>
                  </div>

                  {!form.categoryId ? (
                    <Card className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                      Selecciona una categoria para habilitar los atributos.
                    </Card>
                  ) : loadingFields ? (
                    <Card className="rounded-2xl border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                      Cargando campos dinamicos...
                    </Card>
                  ) : (
                    <DynamicFieldsForm
                      fields={fields}
                      attributes={form.attributes}
                      disabled={submitting}
                      onChange={(nextAttributes) =>
                        setForm((previous) => ({
                          ...previous,
                          attributes: nextAttributes,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            </EditorSection>
          ) : null}

          {step === 2 ? (
            <EditorSection
              title="Confirmacion"
              description="Revisa el borrador antes de crearlo. Luego iras al editor completo para subir imagenes y publicar."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Resumen principal
                    </div>
                    <SummaryRow
                      label="Categoria"
                      value={selectedCategory?.name ?? "Sin elegir"}
                    />
                    <SummaryRow
                      label="Titulo"
                      value={form.title.trim() || "Sin titulo"}
                    />
                    <SummaryRow
                      label="Descripcion"
                      value={form.description.trim() || "Sin descripcion"}
                    />
                    <SummaryRow
                      label="Precio"
                      value={
                        form.price.trim()
                          ? `${form.price} ${form.currency}`
                          : "No definido"
                      }
                    />
                    {rules.showLocation ? (
                      <SummaryRow
                        label="Ubicacion"
                        value={form.locationText.trim() || "No definida"}
                      />
                    ) : null}
                  </div>
                </Card>

                <Card className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Atributos dinamicos
                    </div>

                    {filledAttributes.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No hay atributos completados para este borrador.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filledAttributes.map(([key, value]) => (
                          <SummaryRow
                            key={key}
                            label={key}
                            value={Array.isArray(value) ? value.join(", ") : String(value)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </EditorSection>
          ) : null}

          <div className="hidden items-center justify-between gap-3 md:flex">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isBusy}>
                Cancelar
              </Button>
              {step > 0 ? (
                <Button variant="outline" onClick={onBack} disabled={isBusy}>
                  Atras
                </Button>
              ) : null}
            </div>

            <div>{primaryButton}</div>
          </div>
        </EditorShell>
      </div>

      <EditorMobileActions>
        {step > 0 ? (
          <Button variant="outline" className="flex-1" onClick={onBack} disabled={isBusy}>
            Atras
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isBusy}>
            Cancelar
          </Button>
        )}

        <div className="flex-1 [&>*]:w-full">{primaryButton}</div>
      </EditorMobileActions>
    </div>
  );
}

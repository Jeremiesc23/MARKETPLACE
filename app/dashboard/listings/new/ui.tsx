"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsForm, { type DynamicField } from "../_components/DynamicFieldsForm";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";

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

function validateStep(step: number, form: ListingFormState, fields: DynamicField[]) {
  if (step === 0) {
    if (!form.categoryId) return "Selecciona una categoría";
    if (!form.title.trim()) return "Escribe un título";
  }
  if (step === 1) {
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
    if (form.currency.trim().length !== 3) return "La moneda debe tener 3 letras (ej: USD)";
  }
  return null;
}

function StepPill({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        active ? "border-foreground/20 bg-muted text-foreground" : "border-border text-muted-foreground",
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

  const selectedCategoryId = useMemo(
    () => Number(form.categoryId) || null,
    [form.categoryId]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.categoryId)) ?? null,
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
        const items = extractArray<Category>(data).map((c: any) => ({
          id: Number(c.id),
          name: String(c.name),
          slug: c.slug ? String(c.slug) : undefined,
        }));

        if (!cancelled) setCategories(items);
      } catch (err: any) {
        if (!cancelled) setPageError(err?.message ?? "No se pudieron cargar las categorías");
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
      const payload = {
        categoryId: Number(form.categoryId),
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price.trim() === "" ? null : Number(form.price),
        currency: (form.currency || "USD").trim().toUpperCase(),
        locationText: form.locationText.trim() || null,
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
      const newId = data?.id ?? data?.listing?.id ?? data?.data?.id ?? data?.item?.id;

      if (newId) {
        // El “paso fotos” lo resuelves en /edit con ListingImagesManager
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

    const err = validateStep(step, form, fields);
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
    <div className="pb-24 md:pb-6">
      <PageHeader
        title="Nueva publicación"
        description="Crea un borrador y luego agrega fotos antes de publicar."
        actions={
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        }
      />

      {/* stepper */}
      <div className="mb-5 flex flex-wrap gap-2">
        <StepPill label="Básico" active={step === 0} done={step > 0} />
        <StepPill label="Detalles" active={step === 1} done={step > 1} />
        <StepPill label="Confirmar" active={step === 2} />
      </div>

      {pageError ? (
        <Card className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {pageError}
        </Card>
      ) : null}

      {submitError ? (
        <Card className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </Card>
      ) : null}

      {/* Paso 0 */}
      {step === 0 ? (
        <Card className="rounded-2xl p-5">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="categoryId">
                Categoría
              </label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                disabled={loadingCategories || submitting}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">
                  {loadingCategories ? "Cargando..." : "Selecciona una categoría"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Esto define los campos dinámicos que verás después.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                disabled={submitting}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ej: Departamento 2 recámaras / Serum vitamina C"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="description">
                Descripción
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                disabled={submitting}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Detalles importantes, beneficios, estado, etc."
              />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Paso 1 */}
      {step === 1 ? (
        <Card className="rounded-2xl p-5">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Precio</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                <div className="grid gap-2">
                  <label className="text-xs text-muted-foreground" htmlFor="price">
                    Monto (opcional)
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    disabled={submitting}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-muted-foreground" htmlFor="currency">
                    Moneda
                  </label>
                  <input
                    id="currency"
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))
                    }
                    disabled={submitting}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="USD"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="locationText">
                Ubicación (texto)
              </label>
              <input
                id="locationText"
                value={form.locationText}
                onChange={(e) => setForm((p) => ({ ...p, locationText: e.target.value }))}
                disabled={submitting}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ej: Guadalajara, JAL / Polanco, CDMX"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="text-sm font-medium">Campos dinámicos</div>
              {!form.categoryId ? (
                <p className="text-sm text-muted-foreground">
                  Selecciona una categoría en el paso anterior.
                </p>
              ) : loadingFields ? (
                <p className="text-sm text-muted-foreground">Cargando campos...</p>
              ) : (
                <DynamicFieldsForm
                  fields={fields}
                  attributes={form.attributes}
                  disabled={submitting}
                  onChange={(next) => setForm((p) => ({ ...p, attributes: next }))}
                />
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Paso 2 */}
      {step === 2 ? (
        <Card className="rounded-2xl p-5">
          <div className="grid gap-3 text-sm">
            <div className="text-base font-medium">Revisión</div>
            <div className="text-muted-foreground">
              Al crear el borrador, te mandaremos al editor para subir fotos y publicar.
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Categoría</span>
                <span className="font-medium">{selectedCategory?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Título</span>
                <span className="font-medium">{form.title.trim() || "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Precio</span>
                <span className="font-medium">
                  {form.price.trim() ? `${form.price} ${form.currency}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ubicación</span>
                <span className="font-medium">{form.locationText.trim() || "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Campos dinámicos</span>
                <span className="font-medium">{fields.length ? `${fields.length} campos` : "—"}</span>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Desktop actions */}
      <div className="mt-6 hidden md:flex items-center justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : onBack} disabled={submitting}>
          {step === 0 ? "Cancelar" : "Atrás"}
        </Button>

        <div className="flex gap-2">
          {step < 2 ? (
            <Button onClick={onNext} disabled={submitting}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={createDraft} disabled={submitting}>
              {submitting ? "Guardando..." : "Crear borrador"}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={step === 0 ? onCancel : onBack}
            disabled={submitting}
          >
            {step === 0 ? "Cancelar" : "Atrás"}
          </Button>

          {step < 2 ? (
            <Button className="w-full" onClick={onNext} disabled={submitting}>
              Siguiente
            </Button>
          ) : (
            <Button className="w-full" onClick={createDraft} disabled={submitting}>
              {submitting ? "Guardando..." : "Crear borrador"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import DynamicFieldsForm, { type DynamicField } from "../../_components/DynamicFieldsForm";
import ListingImagesManager from "../../_components/ListingImagesManager";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  status: string;
};

type ListingImage = {
  id: number;
  listingId: number;
  siteId: number;
  objectKey: string;
  publicUrl: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  sortOrder: number;
  isCover: boolean;
  createdAt?: string | null;
};

type SectionKey = "info" | "fields" | "images";

function extractArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.fields)) return payload.fields;
  if (Array.isArray(payload?.listings)) return payload.listings;
  return [];
}

function parseMaybeJson(value: any) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeFields(payload: any): DynamicField[] {
  const raw = extractArray<any>(payload);

  return raw
    .map((f) => ({
      key: String(f.key),
      label: String(f.label ?? f.key),
      type: (f.type ?? "text") as DynamicField["type"],
      options: parseMaybeJson(f.options) ?? null,
      constraints: parseMaybeJson(f.constraints) ?? null,
      isRequired: Boolean(f.isRequired ?? f.is_required ?? false),
      sortOrder: Number(f.sortOrder ?? f.sort_order ?? 0),
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function extractListing(payload: any): any {
  if (!payload) return null;
  return payload.listing ?? payload.data ?? payload.item ?? payload;
}

function extractImages(payload: any): ListingImage[] {
  const arr =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.images) && payload.images) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return arr.map((img: any) => ({
    id: Number(img.id),
    listingId: Number(img.listingId ?? img.listing_id),
    siteId: Number(img.siteId ?? img.site_id),
    objectKey: String(img.objectKey ?? img.object_key ?? ""),
    publicUrl: String(img.publicUrl ?? img.public_url ?? ""),
    contentType: img.contentType ?? img.content_type ?? null,
    sizeBytes:
      img.sizeBytes == null && img.size_bytes == null ? null : Number(img.sizeBytes ?? img.size_bytes),
    sortOrder: Number(img.sortOrder ?? img.sort_order ?? 0),
    isCover: Boolean(img.isCover ?? img.is_cover ?? false),
    createdAt: img.createdAt ?? img.created_at ?? null,
  }));
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
  return data?.error || data?.message || (typeof data === "string" ? data : null) || `Error ${res.status}`;
}

function Segmented({
  value,
  onChange,
  items,
}: {
  value: SectionKey;
  onChange: (v: SectionKey) => void;
  items: { key: SectionKey; label: string; hint?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              "rounded-full border px-3 py-1 text-xs transition",
              active ? "border-foreground/20 bg-muted text-foreground" : "border-border text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            {it.label}
            {it.hint ? <span className="ml-2 opacity-70">{it.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function EditListingFormPage({ id }: { id: string }) {
  const router = useRouter();

  const [section, setSection] = useState<SectionKey>("info");

  const [form, setForm] = useState<ListingFormState>({
    categoryId: "",
    title: "",
    description: "",
    price: "",
    currency: "USD",
    locationText: "",
    attributes: {},
    status: "draft",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<DynamicField[]>([]);

  const [images, setImages] = useState<ListingImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // límites UI
  const maxImages = 12;
  const reachedLimit = images.length >= maxImages;
  const canPublish = form.status !== "published" && images.length > 0;

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.categoryId)) ?? null,
    [categories, form.categoryId]
  );

  async function loadFields(categoryId: number, currentAttributes?: Record<string, unknown>) {
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
      setFields(nextFields);

      const validKeys = new Set(nextFields.map((f) => f.key));
      setForm((prev) => {
        const base = currentAttributes ?? prev.attributes ?? {};
        const pruned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(base)) {
          if (validKeys.has(k)) pruned[k] = v;
        }
        return { ...prev, attributes: pruned };
      });
    } catch (err: any) {
      setFields([]);
      setPageError(err?.message ?? "No se pudieron cargar los campos");
    } finally {
      setLoadingFields(false);
    }
  }

  async function loadImages() {
    setImagesLoading(true);
    setImagesError(null);

    try {
      const res = await fetch(`/api/listings/${id}/images`, {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      const data = await safeJson(res);
      setImages(extractImages(data));
    } catch (err: any) {
      setImages([]);
      setImagesError(err?.message ?? "No se pudieron cargar las imágenes");
    } finally {
      setImagesLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setInitialLoading(true);
      setPageError(null);
      setSubmitError(null);
      setPublishError(null);
      setSuccessMessage(null);

      try {
        const [categoriesRes, listingRes] = await Promise.all([
          fetch("/api/categories", { credentials: "same-origin", cache: "no-store" }),
          fetch(`/api/listings/${id}`, { credentials: "same-origin", cache: "no-store" }),
        ]);

        if (!categoriesRes.ok) throw new Error(await getErrorMessage(categoriesRes));
        if (!listingRes.ok) throw new Error(await getErrorMessage(listingRes));

        const [categoriesData, listingData] = await Promise.all([safeJson(categoriesRes), safeJson(listingRes)]);
        if (cancelled) return;

        const categoryItems = extractArray<Category>(categoriesData).map((c: any) => ({
          id: Number(c.id),
          name: String(c.name),
          slug: c.slug ? String(c.slug) : undefined,
        }));
        setCategories(categoryItems);

        const listing = extractListing(listingData);
        if (!listing) throw new Error("Listing no encontrado");

        const rawAttributes = parseMaybeJson(listing.attributes);
        const safeAttributes =
          rawAttributes && typeof rawAttributes === "object" && !Array.isArray(rawAttributes)
            ? (rawAttributes as Record<string, unknown>)
            : {};

        const nextForm: ListingFormState = {
          categoryId: String(listing.categoryId ?? listing.category_id ?? ""),
          title: String(listing.title ?? ""),
          description: String(listing.description ?? ""),
          price: listing.price === null || listing.price === undefined ? "" : String(listing.price),
          currency: String(listing.currency ?? "USD"),
          locationText: String(listing.locationText ?? listing.location_text ?? ""),
          attributes: safeAttributes,
          status: String(listing.status ?? "draft"),
        };

        setForm(nextForm);

        const categoryIdNum = Number(nextForm.categoryId);
        if (categoryIdNum) await loadFields(categoryIdNum, nextForm.attributes);
      } catch (err: any) {
        if (!cancelled) setPageError(err?.message ?? "No se pudo cargar el listing");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCategoryChange(nextCategoryId: string) {
    if (submitting || publishing || imageUploading) return;

    const hasAttrs = Object.keys(form.attributes || {}).length > 0;
    if (hasAttrs && nextCategoryId !== form.categoryId) {
      const ok = window.confirm("Cambiar de categoría borrará los campos dinámicos actuales. ¿Continuar?");
      if (!ok) return;
    }

    setSubmitError(null);
    setPublishError(null);
    setSuccessMessage(null);

    setForm((prev) => ({
      ...prev,
      categoryId: nextCategoryId,
      attributes: {},
    }));
    setFields([]);

    const categoryIdNum = Number(nextCategoryId);
    if (!categoryIdNum) return;
    await loadFields(categoryIdNum, {});
  }

  function buildPayload() {
    return {
      categoryId: Number(form.categoryId),
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price === "" ? null : Number(form.price),
      currency: (form.currency || "USD").trim().toUpperCase(),
      locationText: form.locationText.trim() || null,
      attributes: form.attributes,
    };
  }

  async function saveDraftRequest() {
    if (!form.categoryId) throw new Error("Selecciona una categoría");

    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(buildPayload()),
    });

    if (!res.ok) throw new Error(await getErrorMessage(res));
    return await safeJson(res);
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();

    setSubmitError(null);
    setPublishError(null);
    setImagesError(null);
    setSuccessMessage(null);

    setSubmitting(true);
    try {
      await saveDraftRequest();
      setSuccessMessage("Cambios guardados");
      router.refresh();
    } catch (err: any) {
      setSubmitError(err?.message ?? "No se pudo actualizar el listing");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    setSubmitError(null);
    setPublishError(null);
    setImagesError(null);
    setSuccessMessage(null);

    if (form.status === "published") {
      setSuccessMessage("Este listing ya está publicado.");
      return;
    }

    if (images.length === 0) {
      setPublishError("Debes subir al menos 1 imagen antes de publicar.");
      setSection("images");
      return;
    }

    setPublishing(true);
    try {
      await saveDraftRequest();

      const res = await fetch(`/api/listings/${id}/publish`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!res.ok) throw new Error(await getErrorMessage(res));

      setForm((prev) => ({ ...prev, status: "published" }));
      setSuccessMessage("Publicado correctamente");
      router.refresh();
    } catch (err: any) {
      setPublishError(err?.message ?? "No se pudo publicar el listing");
    } finally {
      setPublishing(false);
    }
  }

  async function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (reachedLimit) {
      setImagesError(`Alcanzaste el máximo de ${maxImages} imágenes.`);
      e.target.value = "";
      return;
    }

    setImagesError(null);
    setSuccessMessage(null);

    try {
      setImageUploading(true);

      const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowed.has(file.type)) throw new Error("Tipo de imagen no permitido. Usa JPG, PNG o WEBP.");

      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) throw new Error("La imagen supera 5MB. Reduce el tamaño e intenta de nuevo.");

      const presignRes = await fetch(`/api/listings/${id}/images/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
      });

      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes));
      const presignData = await safeJson(presignRes);

      const uploadUrl = String(presignData?.uploadUrl ?? "");
      const objectKey = String(presignData?.objectKey ?? "");
      const publicUrl = String(presignData?.publicUrl ?? "");

      if (!uploadUrl || !objectKey) throw new Error("Respuesta inválida al pedir URL de subida");

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Falló la subida al bucket (${uploadRes.status})`);

      const confirmRes = await fetch(`/api/listings/${id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          objectKey,
          publicUrl,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!confirmRes.ok) throw new Error(await getErrorMessage(confirmRes));

      await loadImages();
      setSuccessMessage("Imagen subida correctamente");
    } catch (err: any) {
      setImagesError(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  const disabledAll = submitting || publishing || imageUploading;

  const segmentItems = useMemo(
    () => [
      { key: "info" as const, label: "Info" },
      { key: "fields" as const, label: "Campos", hint: fields.length ? `${fields.length}` : undefined },
      { key: "images" as const, label: "Imágenes", hint: `${images.length}/${maxImages}` },
    ],
    [fields.length, images.length]
  );

  if (initialLoading) {
    return (
      <div className="grid gap-4">
        <PageHeader title={`Editar #${id}`} description="Cargando información..." />
        <Card className="rounded-2xl p-6 text-sm text-muted-foreground">Cargando listing…</Card>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6">
      <PageHeader
        title={`Editar #${id}`}
        description={selectedCategory?.name ? `Categoría: ${selectedCategory.name}` : "Edita la información y sube fotos."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/listings")} disabled={disabledAll}>
              Volver
            </Button>

            <Button variant="outline" onClick={() => handleSubmit()} disabled={disabledAll}>
              Guardar
            </Button>

            <Button onClick={handlePublish} disabled={disabledAll || !canPublish}>
              {publishing
                ? "Publicando..."
                : form.status === "published"
                ? "Publicado"
                : canPublish
                ? "Publicar"
                : "Sube 1 imagen"}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge variant={form.status === "published" ? "default" : "secondary"}>
          {form.status === "published" ? "Publicado" : "Borrador"}
        </Badge>
        <span className="text-xs text-muted-foreground">{images.length} img</span>
      </div>

      {/* alerts */}
      <div className="grid gap-3">
        {pageError ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {pageError}
          </Card>
        ) : null}

        {submitError ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </Card>
        ) : null}

        {publishError ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {publishError}
          </Card>
        ) : null}

        {imagesError ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {imagesError}
          </Card>
        ) : null}

        {successMessage ? (
          <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
            {successMessage}
          </Card>
        ) : null}
      </div>

      <Separator className="my-5" />

      {/* sections */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <Segmented value={section} onChange={setSection} items={segmentItems} />
      </div>

      {/* FORM wrapper (so enter key works in inputs) */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* INFO */}
        {section === "info" ? (
          <Card className="rounded-2xl p-5">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="categoryId">
                  Categoría
                </label>
                <select
                  id="categoryId"
                  value={form.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={disabledAll}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Cambiar categoría limpia los campos dinámicos.
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
                  disabled={disabledAll}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                  disabled={disabledAll}
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="price">
                    Precio
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    disabled={disabledAll}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="currency">
                    Moneda
                  </label>
                  <input
                    id="currency"
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                    disabled={disabledAll}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="USD"
                  />
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
                  disabled={disabledAll}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Ej: Polanco, CDMX"
                />
              </div>
            </div>
          </Card>
        ) : null}

        {/* FIELDS */}
        {section === "fields" ? (
          <Card className="rounded-2xl p-5">
            <div className="grid gap-3">
              <div className="text-sm font-medium">Campos dinámicos</div>

              {!form.categoryId ? (
                <p className="text-sm text-muted-foreground">
                  Selecciona una categoría en “Info” para cargar sus campos.
                </p>
              ) : loadingFields ? (
                <p className="text-sm text-muted-foreground">Cargando campos…</p>
              ) : (
                <DynamicFieldsForm
                  fields={fields}
                  attributes={form.attributes}
                  disabled={disabledAll}
                  onChange={(next) => setForm((p) => ({ ...p, attributes: next }))}
                />
              )}
            </div>
          </Card>
        ) : null}

        {/* IMAGES */}
        {section === "images" ? (
          <Card className="rounded-2xl p-5">
            <div className="grid gap-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Imágenes</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    JPG/PNG/WEBP · máximo 5MB · {images.length}/{maxImages}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Subir imagen</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  disabled={disabledAll || reachedLimit}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
                />

                {reachedLimit ? (
                  <p className="text-xs text-destructive">Alcanzaste el máximo de {maxImages} imágenes.</p>
                ) : null}

                {imageUploading ? <p className="text-sm text-muted-foreground">Subiendo imagen…</p> : null}
                {imagesLoading ? <p className="text-sm text-muted-foreground">Cargando imágenes…</p> : null}
              </div>

              {(!imagesLoading && images.length === 0) ? (
                <Card className="rounded-2xl border-dashed p-4">
                  <div className="text-sm font-medium">Aún no hay imágenes</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Sube al menos 1 imagen para poder publicar.
                  </div>
                </Card>
              ) : null}

              {images.length > 0 ? (
                <ListingImagesManager
                  listingId={Number(id)}
                  images={images.map((img) => ({
                    id: img.id,
                    publicUrl: img.publicUrl,
                    sortOrder: img.sortOrder,
                    isCover: img.isCover,
                    sizeBytes: img.sizeBytes ?? null,
                  }))}
                  onChanged={loadImages}
                />
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* Desktop inline actions under content */}
        <div className="hidden md:flex items-center justify-between">
          <Button variant="outline" type="button" onClick={() => router.push("/dashboard/listings")} disabled={disabledAll}>
            Volver
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" type="submit" disabled={disabledAll}>
              {submitting ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button type="button" onClick={handlePublish} disabled={disabledAll || !canPublish}>
              {publishing
                ? "Publicando..."
                : form.status === "published"
                ? "Publicado"
                : canPublish
                ? "Publicar"
                : "Sube 1 imagen"}
            </Button>
          </div>
        </div>
      </form>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => router.push("/dashboard/listings")}
            disabled={disabledAll}
          >
            Volver
          </Button>

          <Button className="w-full" type="button" onClick={() => handleSubmit()} disabled={disabledAll}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>

          <Button className="w-full" type="button" onClick={handlePublish} disabled={disabledAll || !canPublish}>
            {publishing
              ? "Publicando..."
              : form.status === "published"
              ? "Publicado"
              : canPublish
              ? "Publicar"
              : "Fotos"}
          </Button>
        </div>
      </div>
    </div>
  );
}
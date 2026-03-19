"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Braces, Plus, Search, Shapes, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import {
  AdminEmptyState,
  AdminPageIntro,
  AdminStat,
  AdminToolbar,
  AdminToolbarLabel,
  adminControlClassName,
  adminSelectClassName,
  adminSurfaceClassName,
  adminTextareaClassName,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAsyncAutocomplete } from "@/hooks/use-autocomplete";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  fetchAdminVerticalSuggestions,
  type AdminAutocompleteOption,
} from "@/lib/admin-autocomplete";
import { cn } from "@/lib/utils";

type Field = {
  id: number;
  vertical_slug: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options: unknown | null;
  constraints: unknown | null;
  is_active: number;
};

const dialogContentClassName =
  "overflow-hidden rounded-[1.6rem] border border-zinc-200/80 bg-white p-0 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-zinc-900/95 sm:max-w-2xl";

function slugifyKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function slugifyVertical(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringifyJson(value: unknown) {
  if (value == null || value === "") return "";

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function countJsonItems(value: unknown) {
  if (value == null || value === "") return 0;

  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return 0;
    }
  }

  if (Array.isArray(parsed)) return parsed.length;
  if (typeof parsed === "object") return Object.keys(parsed as Record<string, unknown>).length;
  return 0;
}

function getTypeVariant(type: Field["type"]) {
  if (type === "select") return "success" as const;
  if (type === "boolean") return "warning" as const;
  if (type === "number") return "secondary" as const;
  return "outline" as const;
}

function matchesFieldQuery(field: Field, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return (
    field.key.toLowerCase().includes(query) ||
    field.label.toLowerCase().includes(query) ||
    field.type.toLowerCase().includes(query) ||
    field.vertical_slug.toLowerCase().includes(query)
  );
}

function buildFieldSearchOptions(
  fields: Field[],
  rawQuery: string
): AdminAutocompleteOption[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return fields
    .filter((field) => matchesFieldQuery(field, query))
    .slice(0, 8)
    .map((field) => ({
      id: `field-${field.id}`,
      value: field.label,
      label: field.label,
      description: `${field.key} · ${field.type}`,
      meta: field.vertical_slug,
    }));
}

async function requestFields(
  verticalQuery: string,
  signal?: AbortSignal
): Promise<Field[]> {
  const res = await fetch(
    `/api/admin/fields?vertical=${encodeURIComponent(verticalQuery)}`,
    {
      cache: "no-store",
      signal,
    }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Error cargando fields");
  }

  return data.fields ?? [];
}

function FieldsLoadingState() {
  return (
    <section className={cn(adminSurfaceClassName, "overflow-hidden")}>
      <div className="border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
        <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-60 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-9 w-32 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminFieldsPage() {
  const [vertical, setVertical] = useState("joyeria");
  const [fields, setFields] = useState<Field[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingFieldId, setApplyingFieldId] = useState<number | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [createVertical, setCreateVertical] = useState("joyeria");
  const [ckey, setCkey] = useState("");
  const [clabel, setClabel] = useState("");
  const [ctype, setCtype] = useState<Field["type"]>("text");
  const [coptions, setCoptions] = useState("");
  const [cconstraints, setCconstraints] = useState("");
  const [cactive, setCactive] = useState(true);

  const [openEdit, setOpenEdit] = useState(false);
  const [edit, setEdit] = useState<Field | null>(null);
  const [elabel, setElabel] = useState("");
  const [etype, setEtype] = useState<Field["type"]>("text");
  const [eoptions, setEoptions] = useState("");
  const [econstraints, setEconstraints] = useState("");
  const [eactive, setEactive] = useState(true);

  const debouncedVertical = useDebouncedValue(vertical, 320);

  const toolbarVerticalSuggestions = useAsyncAutocomplete<AdminAutocompleteOption>({
    query: vertical,
    fetcher: fetchAdminVerticalSuggestions,
    delay: 320,
    minQueryLength: 1,
  });

  const createVerticalSuggestions = useAsyncAutocomplete<AdminAutocompleteOption>({
    query: createVertical,
    fetcher: fetchAdminVerticalSuggestions,
    delay: 320,
    minQueryLength: 1,
  });

  useEffect(() => {
    const currentVertical = debouncedVertical.trim();

    if (!currentVertical) {
      setFields([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    requestFields(currentVertical, controller.signal)
      .then((nextFields) => {
        if (controller.signal.aborted) return;
        setFields(nextFields);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Error";
        toast.error(message);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedVertical]);

  const filtered = useMemo(() => {
    return fields.filter((field) => matchesFieldQuery(field, q));
  }, [fields, q]);

  const fieldSearchOptions = useMemo(() => {
    return buildFieldSearchOptions(fields, q);
  }, [fields, q]);

  const activeCount = fields.filter((field) => Number(field.is_active) === 1).length;
  const selectCount = fields.filter((field) => field.type === "select").length;

  async function refreshCurrentList(verticalQuery = vertical) {
    const currentVertical = verticalQuery.trim();
    if (!currentVertical) {
      setFields([]);
      return;
    }

    setLoading(true);
    try {
      const nextFields = await requestFields(currentVertical);
      setFields(nextFields);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function createField() {
    const targetVertical = slugifyVertical(createVertical);

    try {
      const res = await fetch("/api/admin/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalSlug: targetVertical,
          key: ckey.trim(),
          label: clabel.trim(),
          type: ctype,
          options: coptions,
          constraints: cconstraints,
          isActive: cactive,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo crear");
      }

      toast.success("Field creado");
      setOpenCreate(false);
      setCkey("");
      setClabel("");
      setCtype("text");
      setCoptions("");
      setCconstraints("");
      setCactive(true);
      setCreateVertical(targetVertical || "joyeria");
      setVertical(targetVertical || "");

      if (targetVertical === vertical.trim()) {
        await refreshCurrentList(targetVertical);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    }
  }

  function openEditDialog(field: Field) {
    setEdit(field);
    setElabel(field.label);
    setEtype(field.type);
    setEoptions(stringifyJson(field.options));
    setEconstraints(stringifyJson(field.constraints));
    setEactive(Boolean(field.is_active));
    setOpenEdit(true);
  }

  async function saveEdit() {
    if (!edit) return;

    try {
      const res = await fetch(`/api/admin/fields/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: elabel.trim(),
          type: etype,
          options: eoptions,
          constraints: econstraints,
          isActive: eactive,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar");
      }

      toast.success("Field actualizado");
      setOpenEdit(false);
      setEdit(null);
      await refreshCurrentList();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    }
  }

  async function applyToAll(fieldId: number) {
    setApplyingFieldId(fieldId);
    try {
      const res = await fetch(`/api/admin/fields/${fieldId}/apply-to-vertical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRequired: false }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo aplicar");
      }

      toast.success(`Aplicado a todas las categorias de ${data.vertical}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setApplyingFieldId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Dialog
        open={openCreate}
        onOpenChange={(next) => {
          setOpenCreate(next);
          if (next) {
            setCreateVertical(vertical || "joyeria");
          }
        }}
      >
        <AdminPageIntro
          eyebrow="Data model"
          title="Fields"
          description="El filtro por vertical ya no exige coincidencia exacta y el buscador interno autocompleta labels, keys y tipos sobre los resultados ya cargados."
          stats={
            <>
              <AdminStat label="Filtro vertical" value={vertical || "Sin definir"} />
              <AdminStat label="Total" value={`${fields.length} fields`} />
              <AdminStat label="Select" value={`${selectCount} con opciones`} />
            </>
          }
          actions={
            <>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-zinc-300 bg-white/90 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <Link href="/admin/categories">Categorias</Link>
              </Button>

              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl px-4 text-sm font-semibold">
                  <Plus className="h-4 w-4" />
                  Nuevo field
                </Button>
              </DialogTrigger>
            </>
          }
        />

        <DialogContent className={dialogContentClassName}>
          <DialogHeader className="border-b border-zinc-200/80 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl tracking-tight">Nuevo field</DialogTitle>
            <DialogDescription>
              Puedes seleccionar una vertical existente desde sugerencias o escribir una nueva si estas modelando otro flujo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <AdminToolbarLabel>Vertical</AdminToolbarLabel>
                <AutocompleteInput
                  value={createVertical}
                  onValueChange={(nextValue) => setCreateVertical(slugifyVertical(nextValue))}
                  options={createVerticalSuggestions.options}
                  loading={createVerticalSuggestions.loading}
                  emptyMessage="Sin verticales. Puedes crear una nueva."
                  inputClassName={adminControlClassName}
                  placeholder="joyeria"
                  aria-label="Vertical"
                />
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Estado</AdminToolbarLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={cactive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCactive(true)}
                  >
                    Activo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!cactive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCactive(false)}
                  >
                    Inactivo
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="space-y-2">
                <AdminToolbarLabel>Label</AdminToolbarLabel>
                <Input
                  value={clabel}
                  onChange={(event) => setClabel(event.target.value)}
                  className={adminControlClassName}
                  placeholder="Material"
                />
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Type</AdminToolbarLabel>
                <select
                  value={ctype}
                  onChange={(event) => setCtype(event.target.value as Field["type"])}
                  className={adminSelectClassName}
                >
                  <option value="text">text</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="select">select</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <AdminToolbarLabel>Key</AdminToolbarLabel>
              <Input
                value={ckey}
                onChange={(event) => setCkey(slugifyKey(event.target.value))}
                className={cn(adminControlClassName, "font-mono")}
                placeholder="material"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Se usa dentro de attributes JSON en los listings del tenant.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <AdminToolbarLabel>Options JSON</AdminToolbarLabel>
                <textarea
                  value={coptions}
                  onChange={(event) => setCoptions(event.target.value)}
                  className={adminTextareaClassName}
                  placeholder='["oro", "plata"]'
                />
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Constraints JSON</AdminToolbarLabel>
                <textarea
                  value={cconstraints}
                  onChange={(event) => setCconstraints(event.target.value)}
                  className={adminTextareaClassName}
                  placeholder='{"min": 0, "max": 200}'
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
              <Button type="button" variant="ghost" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!createVertical.trim() || !ckey.trim() || !clabel.trim()}
                onClick={() => void createField()}
              >
                Crear field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminToolbar className="p-3.5">
        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-1.5">
            <AdminToolbarLabel>Vertical</AdminToolbarLabel>
            <AutocompleteInput
              value={vertical}
              onValueChange={(nextValue) => setVertical(slugifyVertical(nextValue))}
              options={toolbarVerticalSuggestions.options}
              loading={toolbarVerticalSuggestions.loading}
              emptyMessage="No hay verticales para esa busqueda"
              inputClassName={adminControlClassName}
              placeholder="Escribe para buscar verticales"
              aria-label="Filtrar por vertical"
            />
          </div>

          <div className="space-y-1.5">
            <AdminToolbarLabel>Buscar</AdminToolbarLabel>
            <AutocompleteInput
              value={q}
              onValueChange={setQ}
              onSelect={(option) => setQ(option.value)}
              options={fieldSearchOptions}
              inputClassName={adminControlClassName}
              leadingIcon={<Search className="h-4 w-4" />}
              placeholder="Buscar por label, key o tipo"
              emptyMessage="No hay fields que coincidan"
              aria-label="Buscar fields"
            />
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300">
              {filtered.length === fields.length
                ? `${filtered.length} resultados`
                : `${filtered.length} de ${fields.length}`}
            </div>
            <div className="hidden rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300 sm:block">
              {activeCount} activos
            </div>
          </div>
        </div>
      </AdminToolbar>

      {loading ? (
        <FieldsLoadingState />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title={q.trim() ? "No encontramos fields" : "No hay fields para este filtro"}
          description={
            q.trim()
              ? "La busqueda es parcial y con sugerencias. Prueba otro termino o selecciona una opcion del dropdown."
              : "Escribe parte del vertical para buscar entre varias verticales o crea el primer field si aun no existe."
          }
          action={
            q.trim() ? (
              <Button variant="outline" onClick={() => setQ("")}>Limpiar busqueda</Button>
            ) : (
              <Button onClick={() => setOpenCreate(true)}>Crear field</Button>
            )
          }
        />
      ) : (
        <section className={cn(adminSurfaceClassName, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                Biblioteca de fields
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Vertical se resuelve server-side con debounce y el buscador interno autocompleta sobre los datos ya cargados.
              </p>
            </div>
            <div className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300 sm:block">
              Vertical {vertical || "todas"}
            </div>
          </div>

          <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {filtered.map((field) => {
              const optionCount = countJsonItems(field.options);
              const constraintsCount = countJsonItems(field.constraints);

              return (
                <article
                  key={field.id}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-950/40 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                        {field.label}
                      </h3>
                      <Badge variant="outline" className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                        {field.key}
                      </Badge>
                      <Badge variant={getTypeVariant(field.type)}>{field.type}</Badge>
                      <Badge variant={field.is_active ? "success" : "secondary"}>
                        {field.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                        ID #{field.id}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 uppercase tracking-[0.12em] dark:border-white/10 dark:bg-zinc-950/50">
                        {field.vertical_slug}
                      </span>
                      {optionCount > 0 ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                          {optionCount} opciones
                        </span>
                      ) : null}
                      {constraintsCount > 0 ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                          {constraintsCount} reglas
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(field)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      disabled={applyingFieldId === field.id}
                      onClick={() => void applyToAll(field.id)}
                    >
                      {applyingFieldId === field.id
                        ? "Aplicando..."
                        : "Aplicar a todas las categorias"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Shapes className="h-4 w-4 text-zinc-400" />
            Vertical parcial
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            El filtro principal ahora acepta coincidencias parciales como joy o skin y devuelve resultados sin exigir nombre completo.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Braces className="h-4 w-4 text-zinc-400" />
            Sugerencias utiles
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            El dropdown propone labels, keys y tipos relevantes mientras el filtro local sigue respondiendo al instante.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Sparkles className="h-4 w-4 text-zinc-400" />
            Mejor ergonomia
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Debounce, cancelacion de requests y navegacion por teclado hacen el flujo mas rapido y predecible.
          </p>
        </div>
      </section>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className={dialogContentClassName}>
          <DialogHeader className="border-b border-zinc-200/80 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl tracking-tight">Editar field</DialogTitle>
            <DialogDescription>
              Ajusta label, tipo, estado y definicion JSON sin perder el contexto del filtro actual.
            </DialogDescription>
          </DialogHeader>

          {!edit ? null : (
            <div className="space-y-5 px-6 py-5">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                  ID #{edit.id}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 uppercase tracking-[0.12em] dark:border-white/10 dark:bg-zinc-950/50">
                  {edit.vertical_slug}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono dark:border-white/10 dark:bg-zinc-950/50">
                  {edit.key}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-2">
                  <AdminToolbarLabel>Label</AdminToolbarLabel>
                  <Input
                    value={elabel}
                    onChange={(event) => setElabel(event.target.value)}
                    className={adminControlClassName}
                  />
                </div>

                <div className="space-y-2">
                  <AdminToolbarLabel>Type</AdminToolbarLabel>
                  <select
                    value={etype}
                    onChange={(event) => setEtype(event.target.value as Field["type"])}
                    className={adminSelectClassName}
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="select">select</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Estado</AdminToolbarLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={eactive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setEactive(true)}
                  >
                    Activo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!eactive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setEactive(false)}
                  >
                    Inactivo
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <AdminToolbarLabel>Options JSON</AdminToolbarLabel>
                  <textarea
                    value={eoptions}
                    onChange={(event) => setEoptions(event.target.value)}
                    className={adminTextareaClassName}
                    placeholder='["oro", "plata"]'
                  />
                </div>

                <div className="space-y-2">
                  <AdminToolbarLabel>Constraints JSON</AdminToolbarLabel>
                  <textarea
                    value={econstraints}
                    onChange={(event) => setEconstraints(event.target.value)}
                    className={adminTextareaClassName}
                    placeholder='{"min": 0, "max": 200}'
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={!elabel.trim()} onClick={() => void saveEdit()}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

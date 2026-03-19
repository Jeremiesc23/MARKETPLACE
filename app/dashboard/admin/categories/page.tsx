"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderTree, Layers3, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import {
  AdminEmptyState,
  AdminPageIntro,
  AdminStat,
  AdminToolbar,
  AdminToolbarLabel,
  adminControlClassName,
  adminSurfaceClassName,
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

type Category = {
  id: number;
  name: string;
  slug: string;
  vertical_slug: string;
  is_active: number;
};

const dialogContentClassName =
  "overflow-hidden rounded-[1.6rem] border border-zinc-200/80 bg-white p-0 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-zinc-900/95 sm:max-w-xl";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesCategoryQuery(category: Category, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return (
    category.name.toLowerCase().includes(query) ||
    category.slug.toLowerCase().includes(query) ||
    category.vertical_slug.toLowerCase().includes(query)
  );
}

function buildCategorySearchOptions(
  categories: Category[],
  rawQuery: string
): AdminAutocompleteOption[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return categories
    .filter((category) => matchesCategoryQuery(category, query))
    .slice(0, 8)
    .map((category) => ({
      id: `category-${category.id}`,
      value: category.name,
      label: category.name,
      description: category.slug,
      meta: category.vertical_slug,
    }));
}

async function requestCategories(
  verticalQuery: string,
  signal?: AbortSignal
): Promise<Category[]> {
  const res = await fetch(
    `/api/admin/categories?vertical=${encodeURIComponent(verticalQuery)}`,
    {
      cache: "no-store",
      signal,
    }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Error cargando categorias");
  }

  return data.categories ?? [];
}

function CategoriesLoadingState() {
  return (
    <section className={cn(adminSurfaceClassName, "overflow-hidden")}>
      <div className="border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
        <div className="h-4 w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-56 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminCategoriesPage() {
  const [vertical, setVertical] = useState("joyeria");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [createVertical, setCreateVertical] = useState("joyeria");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newActive, setNewActive] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editActive, setEditActive] = useState(true);

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
      setCategories([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    requestCategories(currentVertical, controller.signal)
      .then((nextCategories) => {
        if (controller.signal.aborted) return;
        setCategories(nextCategories);
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
    return categories.filter((item) => matchesCategoryQuery(item, q));
  }, [categories, q]);

  const categorySearchOptions = useMemo(() => {
    return buildCategorySearchOptions(categories, q);
  }, [categories, q]);

  const activeCount = categories.filter((item) => Number(item.is_active) === 1).length;

  async function refreshCurrentList(verticalQuery = vertical) {
    const currentVertical = verticalQuery.trim();
    if (!currentVertical) {
      setCategories([]);
      return;
    }

    setLoading(true);
    try {
      const nextCategories = await requestCategories(currentVertical);
      setCategories(nextCategories);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    const targetVertical = slugify(createVertical);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalSlug: targetVertical,
          name: newName.trim(),
          slug: newSlug.trim(),
          isActive: newActive,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo crear");
      }

      toast.success("Categoria creada");
      setOpenCreate(false);
      setNewName("");
      setNewSlug("");
      setNewActive(true);
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

  function openEditDialog(item: Category) {
    setEditItem(item);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditActive(Boolean(item.is_active));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editItem) return;

    try {
      const res = await fetch(`/api/admin/categories/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          isActive: editActive,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar");
      }

      toast.success("Categoria actualizada");
      setEditOpen(false);
      setEditItem(null);
      await refreshCurrentList();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
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
          eyebrow="Taxonomy"
          title="Categorias"
          description="Ahora el filtro por vertical acepta coincidencias parciales, autocompleta sugerencias reales y mantiene la busqueda interna instantanea sobre la lista ya cargada."
          stats={
            <>
              <AdminStat label="Filtro vertical" value={vertical || "Sin definir"} />
              <AdminStat label="Total" value={`${categories.length} categorias`} />
              <AdminStat label="Activas" value={`${activeCount} visibles`} />
            </>
          }
          actions={
            <>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-zinc-300 bg-white/90 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <Link href="/admin">Control panel</Link>
              </Button>

              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl px-4 text-sm font-semibold">
                  <Plus className="h-4 w-4" />
                  Nueva categoria
                </Button>
              </DialogTrigger>
            </>
          }
        />

        <DialogContent className={dialogContentClassName}>
          <DialogHeader className="border-b border-zinc-200/80 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl tracking-tight">Nueva categoria</DialogTitle>
            <DialogDescription>
              Puedes reutilizar una vertical existente desde sugerencias o escribir una nueva si la estas creando.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <AdminToolbarLabel>Vertical</AdminToolbarLabel>
                <AutocompleteInput
                  value={createVertical}
                  onValueChange={(nextValue) => setCreateVertical(slugify(nextValue))}
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
                    variant={newActive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewActive(true)}
                  >
                    Activa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!newActive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewActive(false)}
                  >
                    Inactiva
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <AdminToolbarLabel>Nombre</AdminToolbarLabel>
                <Input
                  value={newName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNewName(value);
                    if (!newSlug.trim()) {
                      setNewSlug(slugify(value));
                    }
                  }}
                  className={adminControlClassName}
                  placeholder="Anillos premium"
                />
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Slug</AdminToolbarLabel>
                <Input
                  value={newSlug}
                  onChange={(event) => setNewSlug(slugify(event.target.value))}
                  className={adminControlClassName}
                  placeholder="anillos-premium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
              <Button type="button" variant="ghost" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!createVertical.trim() || !newName.trim() || !newSlug.trim()}
                onClick={() => void createCategory()}
              >
                Crear categoria
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
              onValueChange={(nextValue) => setVertical(slugify(nextValue))}
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
              options={categorySearchOptions}
              inputClassName={adminControlClassName}
              leadingIcon={<Search className="h-4 w-4" />}
              placeholder="Buscar por nombre o slug"
              emptyMessage="No hay categorias que coincidan"
              aria-label="Buscar categorias"
            />
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300">
              {filtered.length === categories.length
                ? `${filtered.length} resultados`
                : `${filtered.length} de ${categories.length}`}
            </div>
          </div>
        </div>
      </AdminToolbar>

      {loading ? (
        <CategoriesLoadingState />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title={q.trim() ? "No hay coincidencias" : "No hay categorias para este filtro"}
          description={
            q.trim()
              ? "La busqueda ahora es parcial y con sugerencias. Prueba otro termino o selecciona una opcion del dropdown."
              : "Escribe parte del vertical para buscar entre varias verticales o crea la primera categoria si aun no existe."
          }
          action={
            q.trim() ? (
              <Button variant="outline" onClick={() => setQ("")}>Limpiar busqueda</Button>
            ) : (
              <Button onClick={() => setOpenCreate(true)}>Crear categoria</Button>
            )
          }
        />
      ) : (
        <section className={cn(adminSurfaceClassName, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                Catalogo de categorias
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                El filtro de vertical se resuelve server-side y la busqueda interna sugiere resultados instantaneos en cliente.
              </p>
            </div>
            <div className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300 sm:block">
              Vertical {vertical || "todas"}
            </div>
          </div>

          <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-950/40 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    <Badge variant="outline" className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                      {item.slug}
                    </Badge>
                    <Badge variant={item.is_active ? "success" : "secondary"}>
                      {item.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                      ID #{item.id}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 uppercase tracking-[0.12em] dark:border-white/10 dark:bg-zinc-950/50">
                      {item.vertical_slug}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button size="sm" variant="soft" asChild>
                    <Link href={`/admin/categories/${item.id}/fields`}>Fields</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                    Editar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <FolderTree className="h-4 w-4 text-zinc-400" />
            Vertical parcial
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Ya no depende de coincidencia exacta. Escribir joy o skin carga resultados parciales y sugerencias reales.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Layers3 className="h-4 w-4 text-zinc-400" />
            Dropdown accesible
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            El combobox soporta teclado, loading, estado vacio y seleccion rapida sin perder consistencia visual.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Sparkles className="h-4 w-4 text-zinc-400" />
            Busqueda instantanea
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Una vez cargada la lista, las sugerencias de categorias se resuelven en cliente para mantener respuesta inmediata.
          </p>
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={dialogContentClassName}>
          <DialogHeader className="border-b border-zinc-200/80 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl tracking-tight">Editar categoria</DialogTitle>
            <DialogDescription>
              Ajusta nombre, slug y visibilidad sin perder el contexto del filtro actual.
            </DialogDescription>
          </DialogHeader>

          {!editItem ? null : (
            <div className="space-y-5 px-6 py-5">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                  ID #{editItem.id}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 uppercase tracking-[0.12em] dark:border-white/10 dark:bg-zinc-950/50">
                  {editItem.vertical_slug}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <AdminToolbarLabel>Nombre</AdminToolbarLabel>
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className={adminControlClassName}
                  />
                </div>

                <div className="space-y-2">
                  <AdminToolbarLabel>Slug</AdminToolbarLabel>
                  <Input
                    value={editSlug}
                    onChange={(event) => setEditSlug(slugify(event.target.value))}
                    className={adminControlClassName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <AdminToolbarLabel>Estado</AdminToolbarLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={editActive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setEditActive(true)}
                  >
                    Activa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!editActive ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setEditActive(false)}
                  >
                    Inactiva
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!editName.trim() || !editSlug.trim()}
                  onClick={() => void saveEdit()}
                >
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

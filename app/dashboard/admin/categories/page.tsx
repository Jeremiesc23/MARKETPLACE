//app/dashboard/admin/categories/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Category = {
  id: number;
  name: string;
  slug: string;
  vertical_slug: string;
  is_active: number;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminCategoriesPage() {
  const [vertical, setVertical] = useState("joyeria");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newActive, setNewActive] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function load() {
    if (!vertical.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/categories?vertical=${encodeURIComponent(vertical.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error cargando categorías");
      }

      setCategories(data.categories ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [vertical]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return categories;

    return categories.filter((item) => {
      return (
        item.name.toLowerCase().includes(search) ||
        item.slug.toLowerCase().includes(search)
      );
    });
  }, [q, categories]);

  async function createCategory() {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalSlug: vertical.trim(),
          name: newName.trim(),
          slug: newSlug.trim(),
          isActive: newActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo crear");
      }

      toast.success("Categoría creada");
      setOpenCreate(false);
      setNewName("");
      setNewSlug("");
      setNewActive(true);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar");
      }

      toast.success("Categoría actualizada");
      setEditOpen(false);
      setEditItem(null);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Admin global: gestiona categorías por vertical.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">Control Panel</Link>
          </Button>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>Nueva categoría</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva categoría</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vertical</label>
                  <Input
                    value={vertical}
                    onChange={(e) => setVertical(slugify(e.target.value))}
                    placeholder="joyeria"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    value={newName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewName(value);
                      if (!newSlug.trim()) {
                        setNewSlug(slugify(value));
                      }
                    }}
                    placeholder="Anillos"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))}
                    placeholder="anillos"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Activa</span>
                  <Button
                    type="button"
                    variant={newActive ? "default" : "secondary"}
                    onClick={() => setNewActive((prev) => !prev)}
                  >
                    {newActive ? "Sí" : "No"}
                  </Button>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      !vertical.trim() || !newName.trim() || !newSlug.trim()
                    }
                    onClick={createCategory}
                  >
                    Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <label className="text-sm font-medium">Vertical</label>
            <Input
              value={vertical}
              onChange={(e) => setVertical(slugify(e.target.value))}
              placeholder="joyeria"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Buscar</label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="anillos / cadenas / aretes..."
            />
          </div>
        </div>

        <Separator />

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay categorías para esta vertical.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline">{item.slug}</Badge>
                      <Badge
                        variant={item.is_active ? "default" : "secondary"}
                      >
                        {item.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      ID: {item.id} · Vertical: {item.vertical_slug}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/admin/categories/${item.id}/fields`}>
                        Fields
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(item)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>

          {!editItem ? null : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                ID: {editItem.id} · Vertical: {editItem.vertical_slug}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(slugify(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Activa</span>
                <Button
                  type="button"
                  variant={editActive ? "default" : "secondary"}
                  onClick={() => setEditActive((prev) => !prev)}
                >
                  {editActive ? "Sí" : "No"}
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!editName.trim() || !editSlug.trim()}
                  onClick={saveEdit}
                >
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
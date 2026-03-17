//app/dashboard/admin/categories/[id]/fields/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Category = { id: number; name: string; slug: string; vertical_slug: string; is_active: number };
type AssignedField = { id: number; key: string; label: string; type: string; isActive: boolean; isRequired: boolean; sortOrder: number };

type Field = { id: number; key: string; label: string; type: string; is_active: number };

export default function AdminCategoryFieldsPage() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);

  const [category, setCategory] = useState<Category | null>(null);
  const [assigned, setAssigned] = useState<AssignedField[]>([]);
  const [allFields, setAllFields] = useState<Field[]>([]);
  const [fieldPick, setFieldPick] = useState(""); // id como string
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/fields`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error cargando");

      setCategory(data.category);
      setAssigned(data.fields ?? []);

      // cargar todos los fields de la vertical
      const vertical = data.category.vertical_slug;
      const resF = await fetch(`/api/admin/fields?vertical=${encodeURIComponent(vertical)}`, { cache: "no-store" });
      const dataF = await resF.json();
      if (!resF.ok) throw new Error(dataF?.message || "Error cargando fields");
      setAllFields(dataF.fields ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(categoryId)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const available = useMemo(() => {
    const used = new Set(assigned.map((x) => x.id));
    return allFields.filter((f) => !used.has(f.id));
  }, [allFields, assigned]);

  async function addField() {
    const fieldId = Number(fieldPick);
    if (!Number.isFinite(fieldId)) return toast.error("Selecciona un field");

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, isRequired: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo agregar");
      toast.success("Field agregado");
      setFieldPick("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  async function toggleRequired(fieldId: number, next: boolean) {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/fields/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRequired: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  async function removeField(fieldId: number) {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/fields/${fieldId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo quitar");
      toast.success("Field quitado");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  async function reorder(nextOrder: AssignedField[]) {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/fields/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldIds: nextOrder.map((x) => x.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo reordenar");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const copy = [...assigned];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    reorder(copy);
  }

  function moveDown(idx: number) {
    if (idx >= assigned.length - 1) return;
    const copy = [...assigned];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    reorder(copy);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!category) return <p className="text-sm text-muted-foreground">No encontrado</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Fields de categoría</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
  <span>{category.name}</span>
  <span>·</span>
  <Badge variant="outline">{category.vertical_slug}</Badge>
  <span>·</span>
  <span className="font-mono">{category.slug}</span>
</div>
        </div>

        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/categories">Volver</Link>
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium">Agregar field</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            list="fields-list"
            value={fieldPick}
            onChange={(e) => setFieldPick(e.target.value)}
            placeholder="Escribe el ID del field o elige del listado…"
          />
          <datalist id="fields-list">
            {available.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.label} ({f.key}) [{f.type}]
              </option>
            ))}
          </datalist>

          <Button onClick={addField}>Agregar</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: también puedes ir a <Link className="underline" href="/dashboard/admin/fields">Fields</Link> y usar “Aplicar a todas las categorías”.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium">Asignados</h2>
        <Separator />

        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay fields asignados.</p>
        ) : (
          <div className="space-y-2">
            {assigned.map((f, idx) => (
              <Card key={f.id} className="p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.label}</span>
                      <Badge variant="outline">{f.key}</Badge>
                      <Badge variant="outline">{f.type}</Badge>
                      <Badge variant={f.isActive ? "default" : "secondary"}>
                        {f.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant={f.isRequired ? "default" : "secondary"}>
                        {f.isRequired ? "Requerido" : "Opcional"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Field ID: {f.id} · sort: {f.sortOrder}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</Button>
                    <Button variant="outline" onClick={() => moveDown(idx)} disabled={idx === assigned.length - 1}>↓</Button>
                    <Button variant="secondary" onClick={() => toggleRequired(f.id, !f.isRequired)}>
                      {f.isRequired ? "Hacer opcional" : "Hacer requerido"}
                    </Button>
                    <Button variant="outline" onClick={() => removeField(f.id)}>Quitar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
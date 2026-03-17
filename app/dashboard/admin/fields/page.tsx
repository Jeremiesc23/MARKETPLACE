"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Field = {
  id: number;
  vertical_slug: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options: any | null;
  constraints: any | null;
  is_active: number;
};

function slugifyKey(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
}

export default function AdminFieldsPage() {
  const [vertical, setVertical] = useState("joyeria");
  const [fields, setFields] = useState<Field[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [ckey, setCkey] = useState("");
  const [clabel, setClabel] = useState("");
  const [ctype, setCtype] = useState<Field["type"]>("text");
  const [coptions, setCoptions] = useState("");
  const [cconstraints, setCconstraints] = useState("");
  const [cactive, setCactive] = useState(true);

  // edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [edit, setEdit] = useState<Field | null>(null);
  const [elabel, setElabel] = useState("");
  const [etype, setEtype] = useState<Field["type"]>("text");
  const [eoptions, setEoptions] = useState("");
  const [econstraints, setEconstraints] = useState("");
  const [eactive, setEactive] = useState(true);

  async function load() {
    if (!vertical.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fields?vertical=${encodeURIComponent(vertical.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error cargando fields");
      setFields(data.fields ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [vertical]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return fields;
    return fields.filter(f =>
      f.key.toLowerCase().includes(s) ||
      f.label.toLowerCase().includes(s) ||
      f.type.toLowerCase().includes(s)
    );
  }, [q, fields]);

  async function createField() {
    try {
      const res = await fetch("/api/admin/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalSlug: vertical.trim(),
          key: ckey.trim(),
          label: clabel.trim(),
          type: ctype,
          options: coptions,
          constraints: cconstraints,
          isActive: cactive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo crear");

      toast.success("Field creado");
      setOpenCreate(false);
      setCkey(""); setClabel(""); setCtype("text"); setCoptions(""); setCconstraints(""); setCactive(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  function openEditDialog(f: Field) {
    setEdit(f);
    setElabel(f.label);
    setEtype(f.type);
    setEoptions(f.options == null ? "" : JSON.stringify(f.options));
    setEconstraints(f.constraints == null ? "" : JSON.stringify(f.constraints));
    setEactive(Boolean(f.is_active));
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
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar");

      toast.success("Field actualizado");
      setOpenEdit(false);
      setEdit(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  async function applyToAll(fieldId: number) {
    try {
      const res = await fetch(`/api/admin/fields/${fieldId}/apply-to-vertical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRequired: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo aplicar");
      toast.success(`Aplicado a todas las categorías de ${data.vertical}`);
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Fields</h1>
          <p className="text-sm text-muted-foreground">Campos reutilizables por vertical + aplicación masiva.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/categories">Categorías</Link>
          </Button>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>Nuevo field</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo field</DialogTitle></DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vertical</label>
                  <Input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="joyeria" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Key</label>
                  <Input value={ckey} onChange={(e) => setCkey(slugifyKey(e.target.value))} placeholder="material" />
                  <p className="text-xs text-muted-foreground">Se guarda en attributes JSON (ej: {"{ \"material\": \"oro\" }"}).</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Label</label>
                  <Input value={clabel} onChange={(e) => setClabel(e.target.value)} placeholder="Material" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={ctype}
                    onChange={(e) => setCtype(e.target.value as any)}
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="select">select</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Options (JSON)</label>
                  <Input value={coptions} onChange={(e) => setCoptions(e.target.value)} placeholder='["oro","plata"] (solo si type=select)' />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Constraints (JSON)</label>
                  <Input value={cconstraints} onChange={(e) => setCconstraints(e.target.value)} placeholder='{"min":0,"max":200}' />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Activo</span>
                  <Button variant={cactive ? "default" : "secondary"} onClick={() => setCactive(!cactive)}>
                    {cactive ? "Sí" : "No"}
                  </Button>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                  <Button disabled={!vertical.trim() || !ckey.trim() || !clabel.trim()} onClick={createField}>
                    Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <label className="text-sm font-medium">Vertical</label>
            <Input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="joyeria" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Buscar</label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="material / skin_type / ..." />
          </div>
        </div>

        <Separator />

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay fields en esta vertical.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <Card key={f.id} className="p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.label}</span>
                      <Badge variant="outline">{f.key}</Badge>
                      <Badge variant="outline">{f.type}</Badge>
                      <Badge variant={f.is_active ? "default" : "secondary"}>
                        {f.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {f.id} · Vertical: {f.vertical_slug}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openEditDialog(f)}>Editar</Button>
                    <Button variant="secondary" onClick={() => applyToAll(f.id)}>
                      Aplicar a todas las categorías
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar field</DialogTitle></DialogHeader>

          {!edit ? null : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                ID: {edit.id} · Vertical: {edit.vertical_slug} · Key: <span className="font-mono">{edit.key}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={elabel} onChange={(e) => setElabel(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={etype}
                  onChange={(e) => setEtype(e.target.value as any)}
                >
                  <option value="text">text</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="select">select</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Options (JSON)</label>
                <Input value={eoptions} onChange={(e) => setEoptions(e.target.value)} placeholder='["oro","plata"]' />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Constraints (JSON)</label>
                <Input value={econstraints} onChange={(e) => setEconstraints(e.target.value)} placeholder='{"min":0,"max":200}' />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Activo</span>
                <Button variant={eactive ? "default" : "secondary"} onClick={() => setEactive(!eactive)}>
                  {eactive ? "Sí" : "No"}
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
                <Button disabled={!elabel.trim()} onClick={saveEdit}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
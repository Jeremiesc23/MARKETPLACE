//app/dashboard/admin/sites/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ResetOwnerPasswordDialog } from "@/components/admin/reset-owner-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Site = {
  id: number;
  subdomain: string;
  vertical_slug: string;
  name: string | null;
  is_active: number;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  facebook_url: string | null;
  instagram_username: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: number;
    force_password_change: number;
  };
};

export default function AdminEditSitePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const siteId = Number(params.id);

  const [site, setSite] = useState<Site | null>(null);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [verticalSlug, setVerticalSlug] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/sites/${siteId}`, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Error cargando sitio");

    setSite(data.site);
    setName(data.site.name ?? "");
    setSubdomain(data.site.subdomain);
    setVerticalSlug(data.site.vertical_slug);
    setContactPhone(data.site.contact_phone ?? "");
    setWhatsappPhone(data.site.whatsapp_phone ?? "");
    setFacebookUrl(data.site.facebook_url ?? "");
    setInstagramUsername(data.site.instagram_username ?? "");
  }

  useEffect(() => {
    if (!Number.isFinite(siteId)) return;
    load().catch((e) => toast.error(e?.message || "Error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const dirty = useMemo(() => {
    if (!site) return false;
    return (
      (site.name ?? "") !== name ||
      site.subdomain !== subdomain ||
      site.vertical_slug !== verticalSlug ||
      (site.contact_phone ?? "") !== contactPhone ||
      (site.whatsapp_phone ?? "") !== whatsappPhone ||
      (site.facebook_url ?? "") !== facebookUrl ||
      (site.instagram_username ?? "") !== instagramUsername
    );
  }, [
    site,
    name,
    subdomain,
    verticalSlug,
    contactPhone,
    whatsappPhone,
    facebookUrl,
    instagramUsername,
  ]);

  async function save() {
    if (!site) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subdomain,
          verticalSlug,
          contactPhone,
          whatsappPhone,
          facebookUrl,
          instagramUsername,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "No se pudo guardar");

      toast.success("Guardado");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!site) return;

    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !Boolean(site.is_active) }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "No se pudo actualizar");

      toast.success(site.is_active ? "Desactivado" : "Activado");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  if (!site) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const hasPendingPasswordChange = Number(site.owner.force_password_change ?? 0) === 1;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Editar sitio</h1>

            <Badge variant={site.is_active ? "default" : "secondary"}>
              {site.is_active ? "Activo" : "Inactivo"}
            </Badge>

            <Badge variant="outline">{site.vertical_slug}</Badge>

            <Badge variant={hasPendingPasswordChange ? "destructive" : "secondary"}>
              {hasPendingPasswordChange
                ? "Password temporal pendiente"
                : "Password actualizada"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Owner: {site.owner.email} ({site.owner.name})
          </p>

          <p className="text-xs text-muted-foreground">
            {hasPendingPasswordChange
              ? "El owner todavía debe cambiar su password temporal."
              : "El owner ya actualizó su password."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Volver
          </Button>

          <ResetOwnerPasswordDialog
            siteId={siteId}
            ownerEmail={site.owner.email}
            triggerLabel="Reset password"
            triggerVariant="outline"
          />

          <Button variant="secondary" onClick={toggleActive}>
            {site.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subdominio</label>
            <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Vertical</label>
            <Input value={verticalSlug} onChange={(e) => setVerticalSlug(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono de contacto</label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="7777-7777"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp</label>
            <Input
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="50377777777"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Página de Facebook</label>
            <Input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/tu-pagina"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Usuario de Instagram</label>
            <Input
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              placeholder="tu_usuario"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!dirty || saving} onClick={() => load()}>
            Descartar
          </Button>
          <Button disabled={!dirty || saving} onClick={save}>
            Guardar cambios
          </Button>
        </div>
      </Card>
    </div>
  );
}
//app/dashboard/admin/sites/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ResetOwnerPasswordDialog } from "@/components/admin/reset-owner-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Site = {
  id: number;
  subdomain: string;
  vertical_slug: string;
  name: string | null;
  is_active: number;
  created_at: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: number;
    force_password_change: number;
  };
};

export default function AdminSitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sites", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json())?.error || "Error cargando sitios");
      const data = await res.json();
      setSites(data.sites ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sites;

    return sites.filter((x) =>
      (x.name ?? "").toLowerCase().includes(s) ||
      x.subdomain.toLowerCase().includes(s) ||
      x.vertical_slug.toLowerCase().includes(s) ||
      x.owner.email.toLowerCase().includes(s)
    );
  }, [q, sites]);

  async function toggleActive(site: Site) {
    const next = site.is_active ? false : true;

    try {
      const res = await fetch(`/api/admin/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });

      if (!res.ok) {
        throw new Error((await res.json())?.error || "No se pudo actualizar");
      }

      toast.success(next ? "Sitio activado" : "Sitio desactivado");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sitios</h1>
          <p className="text-sm text-muted-foreground">
            Crear, editar, activar/desactivar y ver si el owner ya cambió su password temporal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">Control Panel</Link>
          </Button>

          <Button asChild>
            <Link href="/dashboard/admin/sites/new">Nuevo sitio</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, subdominio, vertical o owner email…"
        />
        <Button variant="outline" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>

      <Separator />

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay sitios.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((site) => {
            const tenantUrl = `http://${site.subdomain}.lvh.me:3000`;
            const hasPendingPasswordChange = Number(site.owner.force_password_change ?? 0) === 1;

            return (
              <Card key={site.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{site.name ?? site.subdomain}</span>

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

                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono">{site.subdomain}</span> · Owner: {site.owner.email}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      URL: {site.subdomain}.lvh.me:3000
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a href={tenantUrl} target="_blank" rel="noreferrer">
                        Abrir sitio
                      </a>
                    </Button>

                    <ResetOwnerPasswordDialog
                      siteId={site.id}
                      ownerEmail={site.owner.email}
                      triggerLabel="Reset password"
                      triggerVariant="outline"
                    />

                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/admin/sites/${site.id}/edit`}>Editar</Link>
                    </Button>

                    <Button
                      variant={site.is_active ? "secondary" : "default"}
                      onClick={() => toggleActive(site)}
                    >
                      {site.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
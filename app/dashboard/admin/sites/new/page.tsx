//app/dashboard/admin/sites/new/page.tsx

"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function genPassword(len = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function copyWithFallback(text: string, input?: HTMLInputElement | null) {
  if (!text) return false;

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    if (input) {
      const prevStart = input.selectionStart;
      const prevEnd = input.selectionEnd;

      input.focus();
      input.select();
      input.setSelectionRange(0, text.length);

      const ok = document.execCommand("copy");

      if (prevStart !== null && prevEnd !== null) {
        input.setSelectionRange(prevStart, prevEnd);
      }

      return ok;
    }
  } catch {}

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);

    return ok;
  } catch {
    return false;
  }
}

type CreatedState = {
  siteId: number;
  ownerUserId: number;
};

export default function AdminNewSitePage() {
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [verticalSlug, setVerticalSlug] = useState("");

  const [contactPhone, setContactPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [tempPassword, setTempPassword] = useState(genPassword());

  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [created, setCreated] = useState<CreatedState | null>(null);

  const cleanSubdomain = useMemo(() => normalizeSlug(subdomain), [subdomain]);
  const cleanVertical = useMemo(() => normalizeSlug(verticalSlug), [verticalSlug]);
  const tenantUrl = useMemo(
    () => (cleanSubdomain ? `http://${cleanSubdomain}.lvh.me:3000` : ""),
    [cleanSubdomain]
  );

  const canSubmit = useMemo(() => {
    return Boolean(
      name.trim() &&
        cleanSubdomain &&
        cleanVertical &&
        ownerName.trim() &&
        ownerEmail.trim() &&
        tempPassword.trim().length >= 8
    );
  }, [name, cleanSubdomain, cleanVertical, ownerName, ownerEmail, tempPassword]);

  async function copyPassword() {
    const ok = await copyWithFallback(tempPassword, passwordInputRef.current);

    if (ok) {
      toast.success("Password copiada");
      return;
    }

    toast.error("No se pudo copiar");
  }

  function resetForm() {
    setName("");
    setSubdomain("");
    setVerticalSlug("");
    setContactPhone("");
    setWhatsappPhone("");
    setFacebookUrl("");
    setInstagramUsername("");
    setOwnerName("");
    setOwnerEmail("");
    setTempPassword(genPassword());
    setSaving(false);
    setFieldError(null);
    setErrorMsg("");
    setCreated(null);
  }

  async function onSubmit() {
    if (!canSubmit || saving) return;

    setSaving(true);
    setFieldError(null);
    setErrorMsg("");

    try {
      const payload = {
        name: name.trim(),
        subdomain: cleanSubdomain,
        verticalSlug: cleanVertical,
        contactPhone: contactPhone.trim(),
        whatsappPhone: whatsappPhone.trim(),
        facebookUrl: facebookUrl.trim(),
        instagramUsername: instagramUsername.trim(),
        owner: {
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          tempPassword: tempPassword.trim(),
        },
      };

      const res = await fetch("/api/admin/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.field) setFieldError(String(data.field));
        throw new Error(data?.error || "No se pudo crear el sitio");
      }

      setCreated({
        siteId: Number(data.siteId),
        ownerUserId: Number(data.ownerUserId),
      });

      const copied = await copyWithFallback(
        payload.owner.tempPassword,
        passwordInputRef.current
      );

      if (copied) {
        toast.success("Sitio creado y password copiada");
      } else {
        toast.success("Sitio creado");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Error");
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nuevo sitio</h1>
          <p className="text-sm text-muted-foreground">
            Crea el sitio y su usuario dueño con password temporal inicial.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/admin/sites">Volver a sitios</Link>
        </Button>
      </div>

      <Card className="space-y-5 p-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-medium">Datos del sitio</h2>
            <p className="text-xs text-muted-foreground">
              El subdominio será la URL del tenant.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del sitio</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Joyería LVH"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subdominio</label>
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(normalizeSlug(e.target.value))}
                placeholder="joyeria-lvh"
                autoCapitalize="none"
              />
              {fieldError === "subdomain" ? (
                <p className="text-xs text-destructive">
                  Ese subdominio ya existe.
                </p>
              ) : tenantUrl ? (
                <p className="text-xs text-muted-foreground">URL: {tenantUrl}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Usa a-z, 0-9 y guiones.
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Vertical</label>
              <Input
                value={verticalSlug}
                onChange={(e) => setVerticalSlug(normalizeSlug(e.target.value))}
                placeholder="joyeria"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h2 className="text-base font-medium">Contacto del sitio</h2>
            <p className="text-xs text-muted-foreground">
              Estos datos aparecerán en las publicaciones públicas.
            </p>
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
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h2 className="text-base font-medium">Usuario dueño</h2>
            <p className="text-xs text-muted-foreground">
              Este usuario será quien administre el tenant.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Jere User"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="jereuser@cliente.com"
                autoCapitalize="none"
                inputMode="email"
              />
              {fieldError === "email" ? (
                <p className="text-xs text-destructive">Ese email ya existe.</p>
              ) : null}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h2 className="text-base font-medium">Password temporal</h2>
            <p className="text-xs text-muted-foreground">
              Guárdala y compártela con el cliente. Después del primer login
              tendrá que cambiarla.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="destructive">Solo se muestra una vez</Badge>
              <span className="text-xs text-muted-foreground">
                Si sales de esta pantalla y no la guardaste, tendrás que resetearla
                luego.
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                ref={passwordInputRef}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Contraseña temporal"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTempPassword(genPassword())}
                aria-label="Generar password"
                title="Generar password"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPassword}
                aria-label="Copiar password"
                title="Copiar password"
                disabled={!tempPassword.trim()}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Se guarda como hash y el cliente la usa para iniciar sesión.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <Card className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </Card>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={resetForm} disabled={saving}>
            Limpiar
          </Button>
          <Button disabled={!canSubmit || saving} onClick={onSubmit}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear sitio"
            )}
          </Button>
        </div>
      </Card>

      {created ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="font-medium">Sitio creado correctamente</div>
                <div className="text-sm text-muted-foreground">
                  Guarda esta información antes de salir.
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <div>
                  <span className="font-medium">Site ID:</span> #{created.siteId}
                </div>
                <div>
                  <span className="font-medium">Owner user ID:</span> #
                  {created.ownerUserId}
                </div>
                <div>
                  <span className="font-medium">Owner email:</span>{" "}
                  {ownerEmail.trim().toLowerCase()}
                </div>
                <div>
                  <span className="font-medium">URL:</span> {tenantUrl}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function copyWithFallback(text: string, input?: HTMLInputElement | null) {
  if (!text) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sigue al fallback
  }

  try {
    if (input) {
      const previousStart = input.selectionStart;
      const previousEnd = input.selectionEnd;

      input.focus();
      input.select();
      input.setSelectionRange(0, text.length);

      const ok = document.execCommand("copy");

      if (previousStart !== null && previousEnd !== null) {
        input.setSelectionRange(previousStart, previousEnd);
      }

      return ok;
    }
  } catch {
    // sigue al textarea fallback
  }

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

export function ResetOwnerPasswordDialog({
  siteId,
  ownerEmail,
  triggerLabel = "Reset password",
  triggerVariant = "outline",
}: {
  siteId: number;
  ownerEmail: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestedPassword = useMemo(() => generateTempPassword(), [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (next) {
      setTempPassword(suggestedPassword);
    } else {
      setTempPassword("");
      setSaving(false);
    }
  }

  async function copyPassword() {
    const ok = await copyWithFallback(tempPassword, inputRef.current);

    if (ok) {
      toast.success("Password copiada");
      return;
    }

    toast.error("No se pudo copiar");
  }

  function regenerate() {
    setTempPassword(generateTempPassword());
  }

  async function onSubmit() {
    const clean = tempPassword.trim();

    if (!clean) {
      toast.error("La password temporal es obligatoria");
      return;
    }

    if (clean.length < 8) {
      toast.error("La password temporal debe tener al menos 8 caracteres");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/sites/${siteId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempPassword: clean }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo restablecer la password");
      }

      const copied = await copyWithFallback(clean, inputRef.current);

      if (copied) {
        toast.success("Password temporal restablecida y copiada");
      } else {
        toast.success("Password temporal restablecida");
      }

      setOpen(false);
      setTempPassword("");
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>{triggerLabel}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restablecer password temporal</DialogTitle>
          <DialogDescription>
            Se asignará una nueva password temporal al owner <strong>{ownerEmail}</strong>.
            En el próximo login se le obligará a cambiarla.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Nueva password temporal</label>

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={regenerate}
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

          <p className="text-xs text-muted-foreground">
            Comparte esta password con el cliente. Después de entrar, deberá cambiarla.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>
            {saving ? "Restableciendo..." : "Guardar y restablecer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
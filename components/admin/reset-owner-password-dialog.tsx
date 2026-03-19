"use client";

import { useRef, useState } from "react";
import { Copy, KeyRound, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { adminControlClassName } from "@/components/admin/admin-ui";
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
  for (let index = 0; index < length; index += 1) {
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
    // continue with fallback
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
    // continue with textarea fallback
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
  triggerClassName,
}: {
  siteId: number;
  ownerEmail: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (next) {
      setTempPassword(generateTempPassword());
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden rounded-[1.6rem] border border-zinc-200/80 bg-white p-0 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-zinc-900/95 sm:max-w-lg">
        <DialogHeader className="border-b border-zinc-200/80 px-6 py-5 text-left dark:border-white/10">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl tracking-tight">Restablecer password temporal</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Se generara una nueva password temporal para <strong>{ownerEmail}</strong>. En el proximo login, el owner debera cambiarla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/85 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            Comparte esta password con el cliente antes de cerrar el modal. La operacion no cambia otras credenciales del sitio.
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Nueva password temporal
            </label>

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={tempPassword}
                onChange={(event) => setTempPassword(event.target.value)}
                className={adminControlClassName}
                placeholder="Minimo 8 caracteres"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerate}
                aria-label="Generar password"
                title="Generar password"
                className="rounded-xl"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyPassword()}
                aria-label="Copiar password"
                title="Copiar password"
                disabled={!tempPassword.trim()}
                className="rounded-xl"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-200/80 px-6 py-4 dark:border-white/10 sm:justify-end sm:space-x-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
            {saving ? "Restableciendo..." : "Guardar y restablecer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

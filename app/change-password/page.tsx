//app/change-password/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

type MeResponse = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    role: string;
    force_password_change?: number;
  };
};

export default function ChangePasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await res.json().catch(() => null)) as MeResponse | null;

        if (!res.ok || !data?.ok || !data.user) {
          window.location.assign("/login");
          return;
        }

        if (Number(data.user.force_password_change ?? 0) !== 1) {
          window.location.assign("/dashboard");
          return;
        }
      } catch {
        window.location.assign("/login");
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg("Completa todos los campos");
      return;
    }

    if (newPassword.length < 8) {
      setMsg("La nueva password debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("La confirmación no coincide");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        setMsg(data?.message ?? "No se pudo actualizar la password");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setMsg("No se pudo actualizar la password");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-dvh bg-muted/30 px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Marketplace
            </Link>
            <ThemeToggle />
          </div>

          <Card className="rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando sesión…
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Marketplace
          </Link>
          <ThemeToggle />
        </div>

        <Card className="rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">Cambiar password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Debes cambiar tu password temporal antes de continuar.
            </p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="currentPassword">
                Password actual
              </label>

              <div className="relative">
                <Input
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showCurrent ? "Ocultar password actual" : "Mostrar password actual"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="newPassword">
                Nueva password
              </label>

              <div className="relative">
                <Input
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showNext ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showNext ? "Ocultar nueva password" : "Mostrar nueva password"}
                >
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirmar nueva password
              </label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repite la nueva password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar nueva password"
              )}
            </Button>

            {msg ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {msg}
              </div>
            ) : null}
          </form>

          <Separator className="my-6" />

          <p className="text-xs text-muted-foreground">
            Después del cambio podrás entrar normalmente al dashboard.
          </p>
        </Card>
      </div>
    </main>
  );
}
//app/login/page.tsx
"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginContent() {
  const sp = useSearchParams();
  const requestedNext = sp.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setMsg(data?.message ?? "Credenciales inválidas");
        return;
      }

      if (data?.mustChangePassword) {
        window.location.assign("/change-password");
        return;
      }

      const fallbackNext =
        data?.user?.role === "admin" ? "/admin" : "/dashboard";

      const destination =
        data?.user?.role === "admin" &&
        (!requestedNext || requestedNext.startsWith("/dashboard"))
          ? "/admin"
          : requestedNext || fallbackNext;

      window.location.assign(destination);
    } catch {
      setMsg("No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Accede para administrar tus publicaciones.
            </p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>

              <div className="relative">
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showPass ? "Ocultar password" : "Mostrar password"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
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
            Al iniciar sesión aceptas las políticas del sitio.
          </p>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ¿Problemas para entrar? Contacta al administrador.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-muted/30 px-4 py-10 flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}

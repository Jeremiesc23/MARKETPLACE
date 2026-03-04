// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

function getOriginFromHeaders(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

type MeResponse = {
  ok: boolean;
  user?: { id: number; email: string; role: string };
};

async function getMe(origin: string, cookie: string): Promise<MeResponse | null> {
  const res = await fetch(`${origin}/api/auth/me`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const h = await headers(); // ✅ aquí va el await
  const origin = getOriginFromHeaders(h as unknown as Headers);
  const cookie = h.get("cookie") ?? "";

  const me = await getMe(origin, cookie);

  if (!me?.ok || !me.user) {
    redirect(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
  }

  return <DashboardShell user={{ email: me.user.email, role: me.user.role }}>{children}</DashboardShell>;
}
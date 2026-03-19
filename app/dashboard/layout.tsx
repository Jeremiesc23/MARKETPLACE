// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildRootUrl,
  buildTenantUrl,
  getHostFromHeaders,
  getOriginFromHeaders,
  isTenantHost,
} from "@/lib/host-routing";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

type MeResponse = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    role: string;
    force_password_change?: number;
    siteSubdomain?: string | null;
  };
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

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const h = await headers();
  const origin = getOriginFromHeaders(h);
  const cookie = h.get("cookie") ?? "";
  const host = getHostFromHeaders(h);

  const me = await getMe(origin, cookie);

  if (!me?.ok || !me.user) {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  if (Number(me.user.force_password_change ?? 0) === 1) {
    redirect("/change-password");
  }

  // admin nunca debe quedarse en un tenant
  if (me.user.role === "admin" && isTenantHost(host)) {
    redirect(buildRootUrl(h, "/admin"));
  }

  // user normal nunca debe quedarse en root
  if (me.user.role !== "admin" && !isTenantHost(host)) {
    if (me.user.siteSubdomain) {
      redirect(buildTenantUrl(h, me.user.siteSubdomain, "/dashboard/listings"));
    }

    redirect("/login");
  }

  return (
    <DashboardShell user={{ email: me.user.email, role: me.user.role }}>
      {children}
    </DashboardShell>
  );
}

//app/dashboard/admin/layout.tsx
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

export const dynamic = "force-dynamic";

type MeResponse = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    role: string;
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

export default async function DashboardAdminLayout({
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
    redirect(`/login?next=${encodeURIComponent("/admin")}`);
  }

  if (me.user.role !== "admin") {
    if (!isTenantHost(host) && me.user.siteSubdomain) {
      redirect(buildTenantUrl(h, me.user.siteSubdomain, "/dashboard/listings"));
    }

    if (isTenantHost(host)) {
      redirect("/dashboard/listings");
    }

    redirect("/login");
  }

  if (isTenantHost(host)) {
    redirect(buildRootUrl(h, "/admin"));
  }

  return <>{children}</>;
}

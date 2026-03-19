//app/dashboard/page.tsx
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

export default async function DashboardIndexPage() {
  const h = await headers();
  const origin = getOriginFromHeaders(h);
  const cookie = h.get("cookie") ?? "";
  const host = getHostFromHeaders(h);

  const me = await getMe(origin, cookie);

  if (!me?.ok || !me.user) {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  if (me.user.role === "admin") {
    if (isTenantHost(host)) {
      redirect(buildRootUrl(h, "/admin"));
    }

    redirect("/admin");
  }

  if (!isTenantHost(host)) {
    if (me.user.siteSubdomain) {
      redirect(buildTenantUrl(h, me.user.siteSubdomain, "/dashboard/listings"));
    }

    redirect("/login");
  }

  redirect("/dashboard/listings");
}

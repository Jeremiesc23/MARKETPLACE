import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getOriginFromHeaders } from "@/lib/host-routing";

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
  try {
    const res = await fetch(`${origin}/api/auth/me`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const h = await headers();
  const origin = getOriginFromHeaders(h);
  const cookie = h.get("cookie") ?? "";

  const me = await getMe(origin, cookie);

  if (!me?.ok || !me.user) {
    redirect("/login");
  }

  if (Number(me.user.force_password_change ?? 0) === 1) {
    redirect("/change-password");
  }

  redirect(me.user.role === "admin" ? "/admin" : "/dashboard");
}

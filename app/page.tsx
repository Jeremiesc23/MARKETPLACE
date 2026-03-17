import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HeadersLike = { get(name: string): string | null };

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

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function getProto(h: HeadersLike) {
  return firstHeaderValue(h.get("x-forwarded-proto")) || "http";
}

function getHost(h: HeadersLike) {
  const directHost = firstHeaderValue(h.get("host"));
  if (directHost) return directHost.toLowerCase();

  return firstHeaderValue(h.get("x-forwarded-host")).toLowerCase();
}

function getOriginFromHeaders(h: HeadersLike) {
  const proto = getProto(h);
  const host = getHost(h) || "localhost:3000";
  return `${proto}://${host}`;
}

async function getMe(origin: string, cookie: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${origin}/api/auth/me`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch (error) {
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

  redirect("/dashboard");
}
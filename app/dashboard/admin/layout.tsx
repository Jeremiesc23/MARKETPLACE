//app/dashboard/admin/layout.tsx
import type { ReactNode } from "react";
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

  const forwardedHost = firstHeaderValue(h.get("x-forwarded-host"));
  return forwardedHost.toLowerCase();
}

function getOriginFromHeaders(h: HeadersLike) {
  const proto = getProto(h);
  const host = getHost(h) || "localhost:3000";
  return `${proto}://${host}`;
}

function splitHostPort(host: string) {
  const [hostname, port] = host.split(":");
  return { hostname, port: port ? `:${port}` : "" };
}

function isIpv4(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function getApexHostname(hostname: string) {
  if (!hostname || hostname === "localhost" || isIpv4(hostname)) return hostname;
  if (hostname.endsWith(".localhost")) return "localhost";

  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

function getTenantSubdomain(host: string) {
  const { hostname } = splitHostPort(host);

  if (!hostname || hostname === "localhost" || isIpv4(hostname)) return "";
  if (hostname.endsWith(".localhost")) return hostname.slice(0, -".localhost".length);

  const parts = hostname.split(".");
  if (parts.length <= 2) return "";
  return parts.slice(0, -2).join(".");
}

function isTenantHost(host: string) {
  return Boolean(getTenantSubdomain(host));
}

function buildRootUrl(h: HeadersLike, pathname: string) {
  const proto = getProto(h);
  const host = getHost(h);
  const { hostname, port } = splitHostPort(host);
  const apex = getApexHostname(hostname) || hostname;
  return `${proto}://${apex}${port}${pathname}`;
}

function buildTenantUrl(h: HeadersLike, subdomain: string, pathname: string) {
  const proto = getProto(h);
  const host = getHost(h);
  const { hostname, port } = splitHostPort(host);
  const apex = getApexHostname(hostname) || hostname;
  return `${proto}://${subdomain}.${apex}${port}${pathname}`;
}

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
  const host = getHost(h);

  const me = await getMe(origin, cookie);

  if (!me?.ok || !me.user) {
    redirect(`/login?next=${encodeURIComponent("/dashboard/admin")}`);
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
    redirect(buildRootUrl(h, "/dashboard/admin"));
  }

  return <>{children}</>;
}
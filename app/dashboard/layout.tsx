// app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";

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

function splitHostPort(host: string) {
  const [hostname, port] = host.split(":");
  return { hostname, port: port ? `:${port}` : "" };
}

function isIpv4(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").toLowerCase();
const DEV_ROOT_DOMAIN = (process.env.DEV_ROOT_DOMAIN || "lvh.me").toLowerCase();

function getApexHostname(hostname: string) {
  if (ROOT_DOMAIN && (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`))) {
    return ROOT_DOMAIN;
  }
  if (DEV_ROOT_DOMAIN && (hostname === DEV_ROOT_DOMAIN || hostname.endsWith(`.${DEV_ROOT_DOMAIN}`))) {
    return DEV_ROOT_DOMAIN;
  }
  return hostname;
}

function getTenantSubdomain(host: string) {
  const { hostname } = splitHostPort(host);
  if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  }
  if (DEV_ROOT_DOMAIN && hostname.endsWith(`.${DEV_ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(`.${DEV_ROOT_DOMAIN}`.length));
  }
  return "";
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

export default async function DashboardLayout({
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
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  if (Number(me.user.force_password_change ?? 0) === 1) {
    redirect("/change-password");
  }

  // admin nunca debe quedarse en un tenant
  if (me.user.role === "admin" && isTenantHost(host)) {
    redirect(buildRootUrl(h, "/dashboard/admin"));
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
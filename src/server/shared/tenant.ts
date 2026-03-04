// src/server/shared/tenant.ts
import { getSiteBySubdomain } from "@/src/server/modules/sites/sites.repo";
import { AppError } from "@/src/server/shared/errors";

const RESERVED = new Set(["www", "localhost", "127", "lvh"]);
const DEFAULT_SUBDOMAIN = "bienes";

function normalizeHost(rawHost: string | null) {
  if (!rawHost) return "";
  // a veces viene "a.com, b.com" en proxies
  return rawHost.split(",")[0]!.trim().toLowerCase();
}

export function getSubdomainFromHost(host: string | null) {
  const h = normalizeHost(host);
  const hostname = h.split(":")[0] || "";
  const sub = hostname.split(".")[0] || "";
  return !sub || RESERVED.has(sub) ? DEFAULT_SUBDOMAIN : sub;
}

export function getSubdomainFromRequest(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "";
  return getSubdomainFromHost(host);
}

export async function getSiteFromRequest(req: Request) {
  const sub = getSubdomainFromRequest(req);
  const site = await getSiteBySubdomain(sub);
  if (!site || !site.is_active) throw new AppError("Sitio no existe o inactivo", 404);
  return site;
}

// Para Server Components: headers() te da un Headers (Web standard)
export async function getSiteFromHeaders(h: Headers) {
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "";
  const sub = getSubdomainFromHost(host);
  const site = await getSiteBySubdomain(sub);
  if (!site || !site.is_active) throw new AppError("Sitio no existe o inactivo", 404);
  return site;
}
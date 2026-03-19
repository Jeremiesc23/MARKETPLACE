// src/server/shared/tenant.ts
import { getSiteBySubdomain } from "@/src/server/modules/sites/sites.repo";
import { AppError } from "@/src/server/shared/errors";
import { extractTenantSubdomain, getHostFromHeaders } from "@/lib/host-routing";

export function getSubdomainFromHost(host: string | null) {
  return extractTenantSubdomain(host);
}

export function getSubdomainFromRequest(req: Request) {
  return getSubdomainFromHost(getHostFromHeaders(req.headers));
}

export async function getSiteFromRequest(req: Request) {
  const sub = getSubdomainFromRequest(req);
  if (!sub) throw new AppError("Tenant requerido", 404);
  const site = await getSiteBySubdomain(sub);
  if (!site || !site.is_active) throw new AppError("Sitio no existe o inactivo", 404);
  return site;
}

// Para Server Components: headers() te da un Headers (Web standard)
export async function getSiteFromHeaders(h: Headers) {
  const sub = getSubdomainFromHost(getHostFromHeaders(h));
  if (!sub) throw new AppError("Tenant requerido", 404);
  const site = await getSiteBySubdomain(sub);
  if (!site || !site.is_active) throw new AppError("Sitio no existe o inactivo", 404);
  return site;
}

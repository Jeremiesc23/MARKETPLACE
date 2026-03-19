//proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  buildRootUrl,
  buildTenantUrlFromHost,
  extractTenantSubdomain,
  getHostFromHeaders,
  getProtoFromHeaders,
  isAllowedTenantSubdomain,
  isRootHost,
  isTenantHost,
  normalizeHost,
  parseInternalTenantPath,
  toExternalAdminPath,
} from "@/lib/host-routing";

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").toLowerCase();

const GLOBAL_ROUTES = [
  "/login",
  "/logout",
  "/dashboard",
  "/change-password",
];

function isStaticOrInternal(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/.well-known/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function isGlobalRoute(pathname: string) {
  return GLOBAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname } = url;
  const host = normalizeHost(getHostFromHeaders(req.headers));

  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  const directTenantPath = parseInternalTenantPath(pathname);
  if (directTenantPath) {
    if (isAllowedTenantSubdomain(directTenantPath.tenant)) {
      const redirectUrl = new URL(
        buildTenantUrlFromHost(
          host,
          getProtoFromHeaders(req.headers),
          directTenantPath.tenant,
          directTenantPath.pathname
        )
      );
      redirectUrl.search = url.search;
      return NextResponse.redirect(redirectUrl, 308);
    }

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (ROOT_DOMAIN && host === `www.${ROOT_DOMAIN}`) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.host = ROOT_DOMAIN;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    const destinationPath = toExternalAdminPath(pathname);
    const redirectUrl = req.nextUrl.clone();

    if (isTenantHost(host)) {
      redirectUrl.href = buildRootUrl(req.headers, destinationPath);
    } else {
      redirectUrl.pathname = destinationPath;
    }

    return NextResponse.redirect(redirectUrl, 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (isTenantHost(host)) {
      const redirectUrl = new URL(buildRootUrl(req.headers, pathname));
      redirectUrl.search = url.search;
      return NextResponse.redirect(redirectUrl, 308);
    }

    return NextResponse.next();
  }

  if (isRootHost(host) || isGlobalRoute(pathname)) {
    return NextResponse.next();
  }

  const tenant = extractTenantSubdomain(host);

  if (!tenant) {
    return NextResponse.next();
  }

  url.pathname =
    pathname === "/" ? `/sites/${tenant}` : `/sites/${tenant}${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};

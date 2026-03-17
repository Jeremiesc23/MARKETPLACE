//proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").toLowerCase();
const DEV_ROOT_DOMAIN = (process.env.DEV_ROOT_DOMAIN || "lvh.me").toLowerCase();

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "localhost",
  "127",
]);

const GLOBAL_ROUTES = [
  "/login",
  "/logout",
  "/dashboard",
  "/change-password",
];

function normalizeHost(rawHost: string | null) {
  if (!rawHost) return "";
  return rawHost.split(",")[0]!.trim().toLowerCase();
}

function getHost(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  return normalizeHost(forwarded ?? host).split(":")[0] ?? "";
}

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

function isRootHost(host: string) {
  const isLocalRoot =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === DEV_ROOT_DOMAIN;

  const isProdRoot =
    !!ROOT_DOMAIN &&
    (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`);

  return isLocalRoot || isProdRoot;
}

function extractTenant(host: string) {
  if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(`.${ROOT_DOMAIN}`.length));
    return RESERVED_SUBDOMAINS.has(subdomain) ? "" : subdomain;
  }

  if (DEV_ROOT_DOMAIN && host.endsWith(`.${DEV_ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(`.${DEV_ROOT_DOMAIN}`.length));
    return RESERVED_SUBDOMAINS.has(subdomain) ? "" : subdomain;
  }

  return "";
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname } = url;
  const host = getHost(req);

  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/sites" || pathname.startsWith("/sites/")) {
    return NextResponse.next();
  }

  if (ROOT_DOMAIN && host === `www.${ROOT_DOMAIN}`) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.host = ROOT_DOMAIN;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Dominio raíz o rutas globales = admin
  if (isRootHost(host) || isGlobalRoute(pathname)) {
    return NextResponse.next();
  }

  // Subdominio = tenant público
  const tenant = extractTenant(host);

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
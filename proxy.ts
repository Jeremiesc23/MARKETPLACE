import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED = new Set(["www", "localhost", "127", "lvh"]);
const NO_REWRITE_PREFIXES = ["/login", "/logout", "/dashboard", "/change-password"];

function normalizeHost(rawHost: string | null) {
  if (!rawHost) return "";
  return rawHost.split(",")[0]!.trim().toLowerCase();
}

function getHost(req: NextRequest) {
  return normalizeHost(req.headers.get("host") ?? req.headers.get("x-forwarded-host"));
}

function getSubdomain(host: string) {
  const hostname = host.split(":")[0] ?? "";
  const sub = hostname.split(".")[0] ?? "";
  return !sub || RESERVED.has(sub) ? "" : sub;
}

function isGlobalRoute(pathname: string) {
  return NO_REWRITE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/sites" || pathname.startsWith("/sites/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    /\.[a-zA-Z0-9]+$/.test(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  if (isGlobalRoute(pathname)) {
    return NextResponse.next();
  }

  const host = getHost(req);
  const subdomain = getSubdomain(host);

  // host raíz: deja que "/" lo atienda app/page.tsx
  if (!subdomain && pathname === "/") {
    return NextResponse.next();
  }

  // tenant host: sigue resolviendo sitio público por subdominio
  const vertical = subdomain || "bienes";

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? `/sites/${vertical}` : `/sites/${vertical}${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED = new Set(["www", "localhost", "127", "lvh"]);
const NO_REWRITE_PREFIXES = ["/login", "/logout", "/dashboard"];

function normalizeHost(rawHost: string | null) {
  if (!rawHost) return "";
  return rawHost.split(",")[0]!.trim().toLowerCase();
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ evita doble rewrite: si ya estás bajo /sites, no tocar
  if (pathname === "/sites" || pathname.startsWith("/sites/")) {
    return NextResponse.next();
  }

  // ✅ nunca reescribas assets internos / api
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ✅ no reescribas archivos estáticos del /public (svg, png, css, etc.)
  if (
    /\.[a-zA-Z0-9]+$/.test(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // ✅ útil si en algún momento usas verificaciones/ACME
  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  // ✅ rutas globales
  if (NO_REWRITE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const host = normalizeHost(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  );
  const hostname = host.split(":")[0];
  const sub = hostname.split(".")[0];

  const vertical = !sub || RESERVED.has(sub) ? "bienes" : sub;

  const url = req.nextUrl.clone();
  url.pathname = `/sites/${vertical}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
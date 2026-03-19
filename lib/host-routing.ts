export type HeaderBag = {
  get(name: string): string | null;
};

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").toLowerCase();
const DEV_ROOT_DOMAIN = (process.env.DEV_ROOT_DOMAIN || "lvh.me").toLowerCase();

const RESERVED_SUBDOMAINS = new Set([
  "",
  "www",
  "admin",
  "localhost",
  "127",
  "127.0.0.1",
]);

export function isAllowedTenantSubdomain(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || RESERVED_SUBDOMAINS.has(normalized)) return false;
  if (normalized.includes(".")) return false;
  return /^[a-z0-9-]+$/.test(normalized);
}

export function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export function normalizeHost(rawHost: string | null) {
  return firstHeaderValue(rawHost).toLowerCase();
}

export function getProtoFromHeaders(headers: HeaderBag) {
  return firstHeaderValue(headers.get("x-forwarded-proto")) || "http";
}

export function getHostFromHeaders(headers: HeaderBag) {
  return normalizeHost(headers.get("x-forwarded-host") ?? headers.get("host"));
}

export function getOriginFromHeaders(headers: HeaderBag) {
  const proto = getProtoFromHeaders(headers);
  const host = getHostFromHeaders(headers) || "localhost:3000";
  return `${proto}://${host}`;
}

export function splitHostPort(host: string) {
  const normalized = normalizeHost(host);
  const [hostname, port] = normalized.split(":");
  return { hostname: hostname || "", port: port ? `:${port}` : "" };
}

export function getApexHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    ROOT_DOMAIN &&
    (normalized === ROOT_DOMAIN || normalized.endsWith(`.${ROOT_DOMAIN}`))
  ) {
    return ROOT_DOMAIN;
  }

  if (
    DEV_ROOT_DOMAIN &&
    (normalized === DEV_ROOT_DOMAIN ||
      normalized.endsWith(`.${DEV_ROOT_DOMAIN}`))
  ) {
    return DEV_ROOT_DOMAIN;
  }

  return normalized;
}

export function isRootHost(host: string) {
  const { hostname } = splitHostPort(host);

  const isLocalRoot =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === DEV_ROOT_DOMAIN;

  const isProdRoot =
    !!ROOT_DOMAIN &&
    (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`);

  return isLocalRoot || isProdRoot;
}

export function extractTenantSubdomain(host: string | null) {
  const { hostname } = splitHostPort(host ?? "");

  if (!hostname || isRootHost(hostname)) {
    return "";
  }

  if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
    if (!isAllowedTenantSubdomain(subdomain)) return "";
    return subdomain;
  }

  if (DEV_ROOT_DOMAIN && hostname.endsWith(`.${DEV_ROOT_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(`.${DEV_ROOT_DOMAIN}`.length));
    if (!isAllowedTenantSubdomain(subdomain)) return "";
    return subdomain;
  }

  return "";
}

export function isTenantHost(host: string | null) {
  return Boolean(extractTenantSubdomain(host));
}

export function buildRootUrl(headers: HeaderBag, pathname: string) {
  const proto = getProtoFromHeaders(headers);
  const host = getHostFromHeaders(headers);
  const { hostname, port } = splitHostPort(host);
  const apex = getApexHostname(hostname) || hostname;
  return `${proto}://${apex}${port}${pathname}`;
}

export function buildTenantUrl(
  headers: HeaderBag,
  subdomain: string,
  pathname: string
) {
  const proto = getProtoFromHeaders(headers);
  const host = getHostFromHeaders(headers);
  return buildTenantUrlFromHost(host, proto, subdomain, pathname);
}

export function buildTenantUrlFromHost(
  host: string,
  proto: string,
  subdomain: string,
  pathname: string
) {
  const { hostname, port } = splitHostPort(host);
  const apex = getApexHostname(hostname) || hostname;
  return `${proto}://${subdomain}.${apex}${port}${pathname}`;
}

export function toExternalAdminPath(pathname: string) {
  if (pathname === "/dashboard/admin") return "/admin";
  if (pathname.startsWith("/dashboard/admin/")) {
    return pathname.replace("/dashboard/admin", "/admin");
  }
  return pathname;
}

export function toInternalAdminPath(pathname: string) {
  if (pathname === "/admin") return "/dashboard/admin";
  if (pathname.startsWith("/admin/")) {
    return pathname.replace("/admin", "/dashboard/admin");
  }
  return pathname;
}

export function parseInternalTenantPath(pathname: string) {
  const match = /^\/sites\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return null;

  return {
    tenant: match[1] ?? "",
    pathname: match[2] || "/",
  };
}

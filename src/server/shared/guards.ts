// src/server/shared/guards.ts
import { AppError } from "./errors";
import { getListingOwnerAndStatus } from "../modules/listings/listings.repo";
import { getSiteFromRequest } from "./tenant";

/** Normaliza errores en API */
export function apiErrorResponse(err: unknown) {
  const status = err instanceof AppError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Error";
  return { status, body: { ok: false, message } };
}

/** Parse seguro de params tipo /[id] */
export function parseIdParam(raw: string, label = "ID") {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${label} inválido`, 400);
  return n;
}

/** Site canónico por host/subdomain + is_active */
export async function requireSite(req: Request) {
  const site = await getSiteFromRequest(req);
  if (!site || !site.is_active) throw new AppError("Site no existe", 404);
  return site;
}

/** CSRF-lite (opcional pero recomendado con cookie httpOnly) */
function firstHeaderValue(v: string | null) {
  if (!v) return null;
  return v.split(",")[0]?.trim() ?? null;
}
function getHost(req: Request) {
  const h =
    firstHeaderValue(req.headers.get("x-forwarded-host")) ||
    firstHeaderValue(req.headers.get("host"));
  return (h || "").toLowerCase();
}
export function assertSameOriginForMutation(req: Request) {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD") return;

  const origin = req.headers.get("origin");
  if (!origin) return; // si quieres exigirlo: throw new AppError("Origin requerido", 403);

  let originHost = "";
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new AppError("Origin inválido", 403);
  }

  if (originHost !== getHost(req)) throw new AppError("Origin inválido", 403);
}

/** Listing ownership + aislamiento por site */
export async function requireOwnerOrAdmin(
  session: { id: number; role?: string },
  listingId: number,
  expectedSiteId?: number
) {
  if (session.role === "admin") return;

  const row = await getListingOwnerAndStatus(listingId);
  if (!row) throw new AppError("No existe", 404);

  // 🔒 evita acceso cruzado por ID a otro tenant
  if (expectedSiteId !== undefined && row.site_id !== expectedSiteId) {
    throw new AppError("No existe", 404);
  }

  if (row.user_id !== session.id) throw new AppError("Forbidden", 403);
}

export async function requireSiteOwnerOrAdmin(
  session: { id: number; role?: string },
  site: { owner_user_id: number }
) {
  if (session.role === "admin") return;
  if (session.id !== site.owner_user_id) throw new AppError("Forbidden", 403);
}
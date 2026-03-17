// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { requireAuth } from "@/src/server/shared/auth";
import {
  requireOwnerOrAdmin,
  requireSiteOwnerOrAdmin,
} from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { updateListingSchema } from "@/src/server/modules/listings/listings.schemas";
import {
  updateListingDraft,
  getListingForSite,
  softDeleteListing,
} from "@/src/server/modules/listings/listings.service";

// ✅ Reglas por vertical
import {
  verticalFormConfig,
  defaultVerticalRules,
} from "@/src/server/shared/verticalFormConfig";

export const runtime = "nodejs";

function getSessionUserId(session: any): number | null {
  const v = session?.user?.id ?? session?.userId ?? session?.id ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const site = await getSiteFromRequest(req);
    const { id } = await context.params;

    const listingId = Number(id);
    if (!Number.isFinite(listingId)) throw new AppError("ID inválido", 400);

    const listing = await getListingForSite(listingId, site.id);
    if (!listing) throw new AppError("No existe", 404);

    // si no está published → solo dueño/admin del listing (y mismo tenant)
    if (listing.status !== "published") {
      const session = requireAuth(req);
      await requireOwnerOrAdmin(session, listingId, site.id);
    }

    return NextResponse.json({
      ok: true,
      site: { id: site.id, subdomain: site.subdomain },
      listing,
    });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    // si “cada usuario solo tiene un sitio”
    await requireSiteOwnerOrAdmin(session, site);

    const { id } = await context.params;
    const listingId = Number(id);
    if (!Number.isFinite(listingId)) throw new AppError("ID inválido", 400);

    // valida dueño del listing y tenant
    await requireOwnerOrAdmin(session, listingId, site.id);

    const body = await req.json();
    const data = updateListingSchema.parse(body);

    // ✅ vertical + reglas
    const vertical = (site as any).vertical_slug ?? (site as any).vertical ?? "";
    const rules = verticalFormConfig[vertical] ?? defaultVerticalRules;

    // ✅ normalizar locationText a string | undefined (nunca null)
    // - si la vertical NO muestra ubicación → ignorar cualquier input
    // - si la muestra:
    //    - string vacío / null → undefined
    //    - string con contenido → string.trim()
    const locationText: string | undefined = rules.showLocation
      ? typeof (data as any).locationText === "string" &&
        (data as any).locationText.trim().length > 0
        ? (data as any).locationText.trim()
        : undefined
      : undefined;

    // ✅ Validación:
    // Si esta vertical requiere ubicación:
    // - si el PATCH incluye locationText (aunque sea null/""), obligar a que tenga valor
    // - si NO viene locationText en el body, dejamos editar otras cosas,
    //   pero si el listing actual no tiene ubicación, también bloqueamos.
    if (rules.requireLocation) {
      const hasLocationKey = Object.prototype.hasOwnProperty.call(
        body ?? {},
        "locationText"
      );

      if (hasLocationKey) {
        if (!locationText) {
          throw new AppError("Ubicación requerida para esta vertical", 400);
        }
      } else {
        const current = await getListingForSite(listingId, site.id);
        const existing =
          (current as any)?.locationText ??
          (current as any)?.location_text ??
          (current as any)?.location ??
          "";

        if (!String(existing ?? "").trim()) {
          throw new AppError("Ubicación requerida para esta vertical", 400);
        }
      }
    }

    await updateListingDraft({
      listingId,
      siteId: site.id,
      vertical: site.vertical_slug,
      data: {
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency,
        locationText, // ✅ ya normalizado (string | undefined)
        attributes: data.attributes,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireSiteOwnerOrAdmin(session, site);

    const { id } = await context.params;
    const listingId = Number(id);
    if (!Number.isFinite(listingId)) throw new AppError("ID inválido", 400);

    await requireOwnerOrAdmin(session, listingId, site.id);

    const body = await req.json().catch(() => ({} as any));
    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim().slice(0, 255)
        : undefined;

    const deletedBy = getSessionUserId(session);

    await softDeleteListing({
      listingId,
      siteId: site.id,
      deletedBy,
      reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status }
    );
  }
}
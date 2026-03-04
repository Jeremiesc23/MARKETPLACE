// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { requireAuth } from "@/src/server/shared/auth";
import { requireOwnerOrAdmin, requireSiteOwnerOrAdmin } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { updateListingSchema } from "@/src/server/modules/listings/listings.schemas";
import { updateListingDraft, getListingForSite } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json({ ok: true, site: { id: site.id, subdomain: site.subdomain }, listing });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
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

    await updateListingDraft({
       listingId,
  siteId: site.id,              // ✅ nuevo
  vertical: site.vertical_slug,
  data: {
    categoryId: data.categoryId,
    title: data.title,
    description: data.description,
    price: data.price,
    currency: data.currency,
    locationText: data.locationText,
    attributes: data.attributes,
  },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}

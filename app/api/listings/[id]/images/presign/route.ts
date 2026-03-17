// app/api/listings/[id]/images/presign/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { requireOwnerOrAdmin, assertSameOriginForMutation } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { createListingImagePresign } from "@/src/server/modules/listings/listingImages.service";
import { getListingForSite } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

async function assertListingNotDeleted(listingId: number, siteId: number) {
  const listing = await getListingForSite(listingId, siteId);
  if (!listing) throw new AppError("No existe", 404);
  if (listing.status === "deleted") throw new AppError("Publicación eliminada", 410);
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginForMutation(req);

    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    const { id } = await context.params;
    const listingId = Number(id);
    if (!Number.isFinite(listingId) || listingId <= 0) throw new AppError("ID inválido", 400);

    await requireOwnerOrAdmin(session, listingId, site.id);

    // 🔒 bloquear mutación si está deleted
    await assertListingNotDeleted(listingId, site.id);

    const body = await req.json().catch(() => ({}));
    const contentType = String(body?.contentType ?? "");
    const sizeBytes = body?.sizeBytes == null ? null : Number(body.sizeBytes);

    if (!contentType) throw new AppError("contentType es requerido", 400);

    // límite opcional de tamaño (5MB)
    if (sizeBytes != null && (!Number.isFinite(sizeBytes) || sizeBytes > 5 * 1024 * 1024)) {
      throw new AppError("La imagen supera el tamaño máximo (5MB)", 400);
    }

    const data = await createListingImagePresign({
      listingId,
      siteId: site.id,
      contentType,
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
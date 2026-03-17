// app/api/listings/[id]/images/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { requireOwnerOrAdmin, assertSameOriginForMutation } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import {
  createListingImageRecord,
  getListingImagesForSite,
} from "@/src/server/modules/listings/listingImages.service";
import { getListingForSite } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

function parseListingId(id: string) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) throw new AppError("ID inválido", 400);
  return n;
}

async function assertListingNotDeleted(listingId: number, siteId: number) {
  const listing = await getListingForSite(listingId, siteId);
  if (!listing) throw new AppError("No existe", 404);
  if (listing.status === "deleted") throw new AppError("Publicación eliminada", 410);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    const { id } = await context.params;
    const listingId = parseListingId(id);

    await requireOwnerOrAdmin(session, listingId, site.id);

    // ✅ GET permitido incluso si está deleted (historial)
    const images = await getListingImagesForSite(listingId, site.id);

    return NextResponse.json({ ok: true, images });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginForMutation(req);

    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    const { id } = await context.params;
    const listingId = parseListingId(id);

    await requireOwnerOrAdmin(session, listingId, site.id);

    // 🔒 bloquear mutación si está deleted
    await assertListingNotDeleted(listingId, site.id);

    const body = await req.json().catch(() => ({}));

    const objectKey = String(body?.objectKey ?? "");
    const contentType = body?.contentType ? String(body.contentType) : null;
    const sizeBytes = body?.sizeBytes == null ? null : Number(body.sizeBytes);

    if (!objectKey) throw new AppError("objectKey es requerido", 400);

    // 🔒 publicUrl NO se acepta del cliente (se deriva en service)
    const { imageId } = await createListingImageRecord({
      listingId,
      siteId: site.id,
      objectKey,
      contentType,
      sizeBytes,
    });

    return NextResponse.json({ ok: true, imageId });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
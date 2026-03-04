import { NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { requireAuth } from "@/src/server/shared/auth";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import {
  requireOwnerOrAdmin,
  assertSameOriginForMutation,
} from "@/src/server/shared/guards";
import { deleteListingImage } from "@/src/server/modules/listings/listingImages.service";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    assertSameOriginForMutation(req);

    const { id, imageId } = await ctx.params;

    const listingId = Number(id);
    const imageIdNum = Number(imageId);

    if (!Number.isFinite(listingId) || listingId <= 0) {
      throw new AppError("ID inválido", 400);
    }
    if (!Number.isFinite(imageIdNum) || imageIdNum <= 0) {
      throw new AppError("imageId inválido", 400);
    }

    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireOwnerOrAdmin(session, listingId, site.id);

    const out = await deleteListingImage({
      listingId,
      siteId: site.id,
      imageId: imageIdNum,
    });

    // ✅ out ya trae ok:true
    return NextResponse.json(out);
  } catch (e: unknown) {
    const status = e instanceof AppError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
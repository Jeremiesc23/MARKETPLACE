import { NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { requireAuth } from "@/src/server/shared/auth";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import {
  requireOwnerOrAdmin,
  assertSameOriginForMutation,
} from "@/src/server/shared/guards";
import { reorderListingImages } from "@/src/server/modules/listings/listingImages.service";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginForMutation(req);

    const { id } = await ctx.params;
    const listingId = Number(id);
    if (!Number.isFinite(listingId) || listingId <= 0) {
      throw new AppError("ID inválido", 400);
    }

    const body = await req.json().catch(() => ({}));
    const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : null;
    if (!orderedIds) throw new AppError("orderedIds es requerido", 400);

    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireOwnerOrAdmin(session, listingId, site.id);

    const out = await reorderListingImages({
      listingId,
      siteId: site.id,
      orderedIds,
    });

    // ✅ out ya trae ok:true
    return NextResponse.json(out);
  } catch (e: unknown) {
    const status = e instanceof AppError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
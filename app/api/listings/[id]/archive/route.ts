// app/api/listings/[id]/archive/route.ts
import { NextResponse } from "next/server";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { requireAuth } from "@/src/server/shared/auth";
import { requireOwnerOrAdmin, requireSiteOwnerOrAdmin } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { archiveListing } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireSiteOwnerOrAdmin(session, site);

    const { id } = await context.params;
    const listingId = Number(id);
    if (!Number.isFinite(listingId)) throw new AppError("ID inválido", 400);

    await requireOwnerOrAdmin(session, listingId, site.id);

    await archiveListing(listingId, site.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}
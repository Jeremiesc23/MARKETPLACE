// app/api/listings/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { requireOwnerOrAdmin } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { publishListing } from "@/src/server/modules/listings/listings.service";
import { getSiteFromRequest } from "@/src/server/shared/tenant";

export const runtime = "nodejs";

type ParamsLike = { id: string } | Promise<{ id: string }>;

export async function POST(req: Request, context: { params: ParamsLike }) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    const { id } = await context.params; // ✅ funciona si es Promise o si es objeto
    const listingId = Number(id);
    if (!Number.isFinite(listingId)) throw new AppError("ID inválido", 400);

    await requireOwnerOrAdmin(session, listingId, site.id);

    await publishListing(listingId, site.id, site.vertical_slug);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
// app/api/dashboard/listings/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { requireSiteOwnerOrAdmin } from "@/src/server/shared/guards";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { getMyListingsWithImagesCount } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

function getSessionUserId(session: any): number {
  const v = session?.user?.id ?? session?.userId ?? session?.id;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new AppError("Sesión inválida", 401);
  return n;
}

export async function GET(req: Request) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    // si “cada usuario solo tiene un sitio”
    await requireSiteOwnerOrAdmin(session, site);

    const userId = getSessionUserId(session);

    const url = new URL(req.url);
    const includeDeleted =
      url.searchParams.get("includeDeleted") === "1" ||
      url.searchParams.get("includeDeleted") === "true";

    // ✅ esto usa tu repo internamente
    const listings = await getMyListingsWithImagesCount(
      userId,
      site.vertical_slug,
      site.id,
      { includeDeleted }
    );

    return NextResponse.json({ ok: true, listings });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message ?? "Error" }, { status });
  }
}
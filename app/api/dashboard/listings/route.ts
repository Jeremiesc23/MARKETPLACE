// app/api/dashboard/listings/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { requireSiteOwnerOrAdmin } from "@/src/server/shared/guards";
import { getMyListingsWithImagesCount } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireSiteOwnerOrAdmin(session, site);

    const listings = await getMyListingsWithImagesCount(
      session.id,
      site.vertical,
      site.id
    );

    return NextResponse.json({
      ok: true,
      site: { id: site.id, subdomain: site.subdomain },
      listings,
    });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Error" },
      { status }
    );
  }
}
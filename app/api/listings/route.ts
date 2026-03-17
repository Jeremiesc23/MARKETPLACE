// app/api/listings/route.ts
// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { requireSiteOwnerOrAdmin } from "@/src/server/shared/guards";
import {
  getPublicListings,
  createListingDraft,
} from "@/src/server/modules/listings/listings.service";
import { createListingSchema } from "@/src/server/modules/listings/listings.schemas";

// ✅ Reglas por vertical
import {
  verticalFormConfig,
  defaultVerticalRules,
} from "@/src/server/shared/verticalFormConfig";

export const runtime = "nodejs";

// GET /api/listings (público: published por SITE)
export async function GET(req: Request) {
  try {
    const site = await getSiteFromRequest(req);
    const listings = await getPublicListings(site.id);
    return NextResponse.json({
      ok: true,
      site: { id: site.id, subdomain: site.subdomain },
      listings,
    });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}

// POST /api/listings (privado: crea draft para SITE)
export async function POST(req: Request) {
  try {
    const session = requireAuth(req);
    const site = await getSiteFromRequest(req);

    await requireSiteOwnerOrAdmin(session, site);

    const body = await req.json().catch(() => ({}));
    const data = createListingSchema.parse(body);

  // ✅ vertical + reglas
const vertical = (site as any).vertical_slug ?? (site as any).vertical ?? "";
const rules = verticalFormConfig[vertical] ?? defaultVerticalRules;

// ✅ normaliza: siempre string | undefined (nunca null)
const rawLoc = rules.showLocation ? (data as any).locationText : undefined;

const locationText: string | undefined =
  typeof rawLoc === "string" && rawLoc.trim().length > 0 ? rawLoc.trim() : undefined;

// ✅ si esta vertical requiere ubicación, validar
if (rules.requireLocation && !locationText) {
  throw new AppError("Ubicación requerida para esta vertical", 400);
}
    const id = await createListingDraft({
      siteId: site.id,
      userId: session.id,
      vertical: site.vertical_slug,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency,
      locationText,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status }
    );
  }
}
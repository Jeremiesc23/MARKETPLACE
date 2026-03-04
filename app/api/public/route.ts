// app/api/public/listings/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { searchPublicListings } from "@/src/server/modules/listings/listings.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z
  .object({
    q: z.string().trim().min(1).max(80).optional(),

    // puedes usar categoryId (recomendado) o category (slug)
    categoryId: z.coerce.number().int().positive().optional(),
    category: z.string().trim().min(1).max(120).optional(),

    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),

    sort: z.enum(["newest", "price_asc", "price_desc", "relevance"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(24),
  })
  .refine((v) => !(v.categoryId && v.category), {
    message: "Usa categoryId o category (slug), no ambos",
  })
  .refine((v) => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice, {
    message: "minPrice no puede ser mayor que maxPrice",
  });

function extractDyn(sp: URLSearchParams) {
  // agrupa repetidos: a_key=v1&a_key=v2
  const map = new Map<string, string[]>();
  for (const [k, v] of sp.entries()) {
    if (!k.startsWith("a_")) continue;
    const arr = map.get(k) ?? [];
    arr.push(v);
    map.set(k, arr);
  }
  return [...map.entries()].map(([name, values]) => ({ name, values }));
}

export async function GET(req: Request) {
  try {
    const site = await getSiteFromRequest(req);
    const sp = new URL(req.url).searchParams;

    const parsed = QuerySchema.safeParse({
      q: sp.get("q") ?? undefined,
      categoryId: sp.get("categoryId") ?? undefined,
      category: sp.get("category") ?? undefined,
      minPrice: sp.get("minPrice") ?? undefined,
      maxPrice: sp.get("maxPrice") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      page: sp.get("page") ?? undefined,
      pageSize: sp.get("pageSize") ?? undefined,
    });
    if (!parsed.success) throw new AppError("Parámetros inválidos", 400);

    const dynRaw = extractDyn(sp);

    const data = await searchPublicListings({
      siteId: Number(site.id),
      vertical: site.vertical_slug,
      q: parsed.data.q,
      categoryId: parsed.data.categoryId,
      categorySlug: parsed.data.category,
      minPrice: parsed.data.minPrice,
      maxPrice: parsed.data.maxPrice,
      sort: parsed.data.sort,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      dynRaw,
      useFulltext: process.env.USE_LISTINGS_FULLTEXT === "1",
    });

    return NextResponse.json({
      ok: true,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: data.total,
      items: data.items,
    });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
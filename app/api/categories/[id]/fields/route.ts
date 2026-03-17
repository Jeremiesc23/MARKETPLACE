// app/api/categories/[id]/fields/route.ts
import { NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { getCategoryFieldsForVertical } from "@/src/server/modules/categories/categoryFields.service";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const site = await getSiteFromRequest(req);

    const { id } = await context.params;
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new AppError("ID inválido", 400);

    const data = await getCategoryFieldsForVertical(categoryId, site.vertical_slug);

   return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}


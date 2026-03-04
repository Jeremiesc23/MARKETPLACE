import { NextResponse } from "next/server";
import { getCategories } from "@/src/server/modules/categories/categories.service";
import { getSiteFromRequest } from "@/src/server/shared/tenant";
import { AppError } from "@/src/server/shared/errors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const site = await getSiteFromRequest(req);
    const vertical = site.vertical; // viene del alias vertical_slug AS vertical
    const categories = await getCategories(vertical);

    return NextResponse.json({ ok: true, vertical, categories });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}
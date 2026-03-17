import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import {
  assertSameOriginForMutation,
  
} from "@/src/server/shared/guards";
import {
  adminCategoriesCreate,
  adminCategoriesList,
} from "@/src/server/modules/categories/adminCategories.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(user: unknown): boolean {
  return typeof user === "object" && user !== null && "role" in user
    ? (user as { role?: string }).role === "admin"
    : false;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const vertical = searchParams.get("vertical");
    if (!vertical) throw new AppError("Falta query param: vertical", 400);

    const categories = await adminCategoriesList(vertical);

    return NextResponse.json({
      ok: true,
      vertical,
      categories,
    });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const body = await req.json();
    const created = await adminCategoriesCreate(body);

    return NextResponse.json({ ok: true, ...created }, { status: 201 });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
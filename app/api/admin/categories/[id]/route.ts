import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import {
  assertSameOriginForMutation,
 
} from "@/src/server/shared/guards";
import {
  adminCategoriesGet,
  adminCategoriesPatch,
} from "@/src/server/modules/categories/adminCategories.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(user: unknown): boolean {
  return typeof user === "object" && user !== null && "role" in user
    ? (user as { role?: string }).role === "admin"
    : false;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const categoryId = Number(id);

    if (!Number.isFinite(categoryId)) {
      throw new AppError("ID inválido", 400);
    }

    const category = await adminCategoriesGet(categoryId);

    return NextResponse.json({ ok: true, category });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const categoryId = Number(id);

    if (!Number.isFinite(categoryId)) {
      throw new AppError("ID inválido", 400);
    }

    const body = await req.json();
    await adminCategoriesPatch(categoryId, body);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
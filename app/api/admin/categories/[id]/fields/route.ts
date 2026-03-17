//app/api/admin/categories/[id]/fields/route.ts

import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { assertSameOriginForMutation} from "@/src/server/shared/guards";
import { adminCategoryFieldsAdd, adminCategoryFieldsList } from "@/src/server/modules/categories/adminCategoryFields.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(u: any) { return u?.role === "admin"; }
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new AppError("ID inválido", 400);

    const data = await adminCategoryFieldsList(categoryId);
    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) throw new AppError("ID inválido", 400);

    const body = await req.json();
    const fieldId = Number(body.fieldId);
    const isRequired = Boolean(body.isRequired);

    if (!Number.isFinite(fieldId)) throw new AppError("fieldId inválido", 400);

    await adminCategoryFieldsAdd(categoryId, fieldId, isRequired);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}
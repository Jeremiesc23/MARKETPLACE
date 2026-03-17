//app/api/admin/categories/[id]/fields/[fieldId]/route.ts


import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { assertSameOriginForMutation} from "@/src/server/shared/guards";
import { adminCategoryFieldsRemove, adminCategoryFieldsToggleRequired } from "@/src/server/modules/categories/adminCategoryFields.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(u: any) { return u?.role === "admin"; }
type Ctx = { params: Promise<{ id: string; fieldId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id, fieldId } = await ctx.params;
    const categoryId = Number(id);
    const fId = Number(fieldId);

    if (!Number.isFinite(categoryId) || !Number.isFinite(fId)) throw new AppError("ID inválido", 400);

    const body = await req.json();
    if (body.isRequired === undefined) throw new AppError("Nada que actualizar", 400);

    await adminCategoryFieldsToggleRequired(categoryId, fId, Boolean(body.isRequired));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id, fieldId } = await ctx.params;
    const categoryId = Number(id);
    const fId = Number(fieldId);

    if (!Number.isFinite(categoryId) || !Number.isFinite(fId)) throw new AppError("ID inválido", 400);

    await adminCategoryFieldsRemove(categoryId, fId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}
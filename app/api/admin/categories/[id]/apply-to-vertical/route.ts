import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { assertSameOriginForMutation } from "@/src/server/shared/guards";
import { adminFieldApplyToVertical } from "@/src/server/modules/categories/adminCategoryFields.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(u: any) { return u?.role === "admin"; }
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const fieldId = Number(id);
    if (!Number.isFinite(fieldId)) throw new AppError("ID inválido", 400);

    const body = await req.json().catch(() => ({}));
    const isRequired = Boolean(body?.isRequired);

    const out = await adminFieldApplyToVertical(fieldId, isRequired);

    return NextResponse.json({ ok: true, ...out });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}
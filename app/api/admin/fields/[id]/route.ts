//app/api/admin/fields/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { assertSameOriginForMutation} from "@/src/server/shared/guards";
import { adminFieldsGet, adminFieldsPatch } from "@/src/server/modules/categories/adminFields.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(u: any) { return u?.role === "admin"; }
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const fieldId = Number(id);
    if (!Number.isFinite(fieldId)) throw new AppError("ID inválido", 400);

    const field = await adminFieldsGet(fieldId);
    return NextResponse.json({ ok: true, field });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { id } = await ctx.params;
    const fieldId = Number(id);
    if (!Number.isFinite(fieldId)) throw new AppError("ID inválido", 400);

    const body = await req.json();
    await adminFieldsPatch(fieldId, body);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}
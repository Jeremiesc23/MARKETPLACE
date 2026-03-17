//api/admin/fields/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/src/server/shared/errors";
import { assertSameOriginForMutation } from "@/src/server/shared/guards";
import { adminFieldsCreate, adminFieldsList } from "@/src/server/modules/categories/adminFields.service";
import { requireAuth } from "@/src/server/shared/auth";
export const runtime = "nodejs";

function isAdmin(u: any) { return u?.role === "admin"; }

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const vertical = searchParams.get("vertical");
    if (!vertical) throw new AppError("Falta query param: vertical", 400);

    const fields = await adminFieldsList(vertical);
    return NextResponse.json({ ok: true, vertical, fields });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertSameOriginForMutation(req);

    const user = await requireAuth(req);
    if (!isAdmin(user)) throw new AppError("Forbidden", 403);

    const body = await req.json();
    const created = await adminFieldsCreate(body);

    return NextResponse.json({ ok: true, ...created }, { status: 201 });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status });
  }
}
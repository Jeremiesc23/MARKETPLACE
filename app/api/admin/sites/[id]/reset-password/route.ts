import { NextRequest, NextResponse } from "next/server";
import { adminSitesResetOwnerPassword } from "@/src/server/modules/sites/adminSites.service";
import { assertSameOriginForMutation } from "@/src/server/shared/guards";
import { requireAuth } from "@/src/server/shared/auth";

function isAdmin(user: any) {
  return user?.role === "admin";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  await assertSameOriginForMutation(req);

  const user = await requireAuth(req);
  if (!isAdmin(user)) return jsonError("Forbidden", 403);

  const { id } = await ctx.params;
  const siteId = Number(id);

  if (!Number.isFinite(siteId)) {
    return jsonError("Bad Request", 400);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await adminSitesResetOwnerPassword(siteId, body);
    return NextResponse.json(result);
  } catch (e: any) {
    const status = Number(e?.status || 500);
    return jsonError(e?.message || "Error", status);
  }
}
//app/api/admin/sites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminSitesCreate, adminSitesList } from "@/src/server/modules/sites/adminSites.service";
import {assertSameOriginForMutation } from "@/src/server/shared/guards";
import { requireAuth } from "@/src/server/shared/auth";
function isAdmin(user: any) {
  return user?.role === "admin";
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!isAdmin(user)) return jsonError("Forbidden", 403);

  const sites = await adminSitesList();
  return NextResponse.json({ sites });
}

export async function POST(req: NextRequest) {
  await assertSameOriginForMutation(req);

  const user = await requireAuth(req);
  if (!isAdmin(user)) return jsonError("Forbidden", 403);

  try {
    const body = await req.json();
    const created = await adminSitesCreate(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const status = Number(e?.status || 500);
    const field = e?.field ? { field: e.field } : undefined;
    return jsonError(e?.message || "Error", status, field);
  }
}
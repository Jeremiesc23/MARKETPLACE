import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/src/server/shared/errors";
import { requireAuth } from "@/src/server/shared/auth";
import {
  adminAutocompleteVerticals,
  parseAutocompleteLimit,
} from "@/src/server/modules/admin/adminAutocomplete.service";

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
    const q = searchParams.get("q") || "";
    const limit = parseAutocompleteLimit(searchParams.get("limit"));

    const options = await adminAutocompleteVerticals(q, limit);

    return NextResponse.json({ ok: true, options });
  } catch (error: unknown) {
    const status = error instanceof AppError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ ok: false, message }, { status });
  }
}

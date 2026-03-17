//app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { AppError } from "@/src/server/shared/errors";
import { findUserById } from "@/src/server/modules/auth/auth.repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = requireAuth(req);
    const user = await findUserById(session.id);
    if (!user) throw new AppError("Usuario no existe", 404);

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 401;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}
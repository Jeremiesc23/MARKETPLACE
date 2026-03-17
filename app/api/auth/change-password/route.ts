//app/api/auth/change-password/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/src/server/shared/auth";
import { AppError } from "@/src/server/shared/errors";
import { changePassword } from "@/src/server/modules/auth/auth.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new AppError("Completa todos los campos", 400);
    }

    if (newPassword.length < 8) {
      throw new AppError("La nueva password debe tener al menos 8 caracteres", 400);
    }

    if (newPassword.length > 200) {
      throw new AppError("La nueva password es demasiado larga", 400);
    }

    if (newPassword !== confirmPassword) {
      throw new AppError("La confirmación no coincide", 400);
    }

    await changePassword(session.id, currentPassword, newPassword);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err.message ?? "Error" }, { status });
  }
}
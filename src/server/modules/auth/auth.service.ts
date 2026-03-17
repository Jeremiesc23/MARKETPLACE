//auth.service.ts
import bcrypt from "bcrypt";
import { AppError } from "@/src/server/shared/errors";
import { findUserAuthById, findUserByEmail, updateUserPassword } from "./auth.repo";
import { signSession } from "@/src/server/shared/auth";

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError("Credenciales inválidas", 401);
  if (!user.is_active) throw new AppError("Usuario desactivado", 403);

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError("Credenciales inválidas", 401);

  const token = signSession({ id: user.id, role: user.role });

  return {
    token,
    mustChangePassword: Boolean(user.force_password_change),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await findUserAuthById(userId);
  if (!user) throw new AppError("Usuario no existe", 404);
  if (!user.is_active) throw new AppError("Usuario desactivado", 403);

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) throw new AppError("Password actual inválido", 400);

  if (currentPassword === newPassword) {
    throw new AppError("La nueva password debe ser distinta a la actual", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await updateUserPassword(userId, passwordHash);

  if (!updated) throw new AppError("No se pudo actualizar la password", 500);

  return { ok: true };
}
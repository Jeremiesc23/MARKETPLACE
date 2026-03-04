import bcrypt from "bcrypt";
import { AppError } from "@/src/server/shared/errors";
import { findUserByEmail } from "./auth.repo";
import { signSession } from "@/src/server/shared/auth";

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError("Credenciales inválidas", 401);
  if (!user.is_active) throw new AppError("Usuario desactivado", 403);

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError("Credenciales inválidas", 401);

  const token = signSession({ userId: user.id, role: user.role });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

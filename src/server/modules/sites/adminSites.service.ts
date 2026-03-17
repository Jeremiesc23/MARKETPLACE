//src/server/modules/sites/adminSites.service.ts
import bcrypt from "bcrypt";
import { AdminCreateSiteSchema, AdminUpdateSiteSchema } from "./adminSites.schemas";
import {
  adminCreateUserAndSite,
  adminGetSiteById,
  adminListSites,
  adminResetSiteOwnerPassword,
  adminUpdateSite,
} from "./adminSites.repo";

function isDupEntry(err: any): boolean {
  return Boolean(err?.code === "ER_DUP_ENTRY");
}

export async function adminSitesList() {
  return adminListSites();
}

export async function adminSitesGet(siteId: number) {
  return adminGetSiteById(siteId);
}

export async function adminSitesCreate(raw: unknown) {
  const input = AdminCreateSiteSchema.parse(raw);

  const passwordHash = await bcrypt.hash(input.owner.tempPassword, 10);

  try {
    const created = await adminCreateUserAndSite({
      ownerName: input.owner.name,
      ownerEmail: input.owner.email,
      ownerPasswordHash: passwordHash,
      siteName: input.name,
      subdomain: input.subdomain,
      verticalSlug: input.verticalSlug,
      contactPhone: input.contactPhone,
      whatsappPhone: input.whatsappPhone,
      facebookUrl: input.facebookUrl,
      instagramUsername: input.instagramUsername,
    });

    return created;
  } catch (e: any) {
    if (isDupEntry(e)) {
      const msg = String(e?.message || "");
      const field = msg.includes("uq_users_email") ? "email" : "subdomain";
      const err = new Error(`Duplicado: ${field}`);
      (err as any).status = 409;
      (err as any).field = field;
      throw err;
    }
    throw e;
  }
}

export async function adminSitesPatch(siteId: number, raw: unknown) {
  const patch = AdminUpdateSiteSchema.parse(raw);

  await adminUpdateSite(siteId, {
    name: patch.name,
    subdomain: patch.subdomain,
    verticalSlug: patch.verticalSlug,
    isActive: patch.isActive,
    contactPhone: patch.contactPhone,
    whatsappPhone: patch.whatsappPhone,
    facebookUrl: patch.facebookUrl,
    instagramUsername: patch.instagramUsername,
  });
}

export async function adminSitesResetOwnerPassword(siteId: number, raw: unknown) {
  const body = (raw ?? {}) as { tempPassword?: unknown };
  const tempPassword = String(body.tempPassword ?? "").trim();

  if (!tempPassword) {
    const err = new Error("La password temporal es obligatoria");
    (err as any).status = 400;
    throw err;
  }

  if (tempPassword.length < 8) {
    const err = new Error("La password temporal debe tener al menos 8 caracteres");
    (err as any).status = 400;
    throw err;
  }

  if (tempPassword.length > 200) {
    const err = new Error("La password temporal es demasiado larga");
    (err as any).status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const result = await adminResetSiteOwnerPassword(siteId, passwordHash);

  return {
    ok: true,
    ownerUserId: result.ownerUserId,
    ownerEmail: result.ownerEmail,
  };
}
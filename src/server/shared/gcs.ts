// src/server/shared/gcs.ts
import path from "node:path";
import crypto from "node:crypto";
import { Storage } from "@google-cloud/storage";
import { AppError } from "@/src/server/shared/errors";

let _storage: Storage | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new AppError(`Falta variable de entorno: ${name}`, 500);
  return value;
}

export function getGcsBucketName() {
  return getEnv("GCS_BUCKET_NAME");
}

function getStorageClient() {
  if (_storage) return _storage;

  const projectId = getEnv("GCP_PROJECT_ID");

  // ✅ Opción 1: archivo JSON de service account (recomendada en local)
  const keyFile = process.env.GCP_KEY_FILE;
  if (keyFile) {
    const keyFilename = path.isAbsolute(keyFile)
      ? keyFile
      : path.join(process.cwd(), keyFile);

    _storage = new Storage({
      projectId,
      keyFilename,
    });

    return _storage;
  }

  // ✅ Opción 2: variables separadas (útil en producción)
  const clientEmail = getEnv("GCP_CLIENT_EMAIL");
  const privateKey = getEnv("GCP_PRIVATE_KEY").replace(/\\n/g, "\n");

  _storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return _storage;
}

export async function createV4UploadSignedUrl(args: {
  objectKey: string;
  contentType: string;
  expiresInMinutes?: number;
}) {
  const storage = getStorageClient();
  const bucketName = getGcsBucketName();

  const file = storage.bucket(bucketName).file(args.objectKey);

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + (args.expiresInMinutes ?? 15) * 60 * 1000,
    contentType: args.contentType,
  });

  return { uploadUrl };
}

export async function objectExists(objectKey: string) {
  const storage = getStorageClient();
  const bucketName = getGcsBucketName();

  const [exists] = await storage.bucket(bucketName).file(objectKey).exists();
  return exists;
}

export async function deleteObject(objectKey: string) {
  const storage = getStorageClient();
  const bucketName = getGcsBucketName();

  await storage.bucket(bucketName).file(objectKey).delete({ ignoreNotFound: true });
}

export function buildPublicUrl(objectKey: string) {
  const bucketName = getGcsBucketName();
  return `https://storage.googleapis.com/${bucketName}/${encodeURI(objectKey)}`;
}

/** Prefijo canónico SOLO para imágenes del listing */
export function getListingImagesPrefix(siteId: number, listingId: number) {
  return `sites/${siteId}/listings/${listingId}/images/`;
}

/** Valida que el objectKey pertenezca al listing/site */
export function assertListingImageObjectKey(objectKey: string, siteId: number, listingId: number) {
  if (!objectKey) throw new AppError("objectKey es requerido", 400);

  if (
    objectKey.startsWith("/") ||
    objectKey.includes("..") ||
    objectKey.includes("\n") ||
    objectKey.includes("\r")
  ) {
    throw new AppError("objectKey inválido", 400);
  }

  const prefix = getListingImagesPrefix(siteId, listingId);
  if (!objectKey.startsWith(prefix)) {
    throw new AppError("objectKey no pertenece a este listing", 400);
  }
}

/** Genera objectKey server-side (ideal para presign) */
export function buildListingImageObjectKey(args: {
  siteId: number;
  listingId: number;
  contentType: string;
}) {
  const ext =
    args.contentType === "image/jpeg" ? "jpg" :
    args.contentType === "image/png"  ? "png" :
    args.contentType === "image/webp" ? "webp" :
    args.contentType === "image/gif"  ? "gif" :
    null;

  if (!ext) throw new AppError("contentType no permitido", 400);

  const prefix = getListingImagesPrefix(args.siteId, args.listingId);
  const name = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
  return `${prefix}${name}`;
}
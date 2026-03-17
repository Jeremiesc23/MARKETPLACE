import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhone(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function buildWhatsAppUrl(phone?: string | null, message?: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const text = message?.trim()
    ? `?text=${encodeURIComponent(message.trim())}`
    : "";

  return `https://wa.me/${normalized}${text}`;
}

export function buildInstagramUrl(username?: string | null) {
  const clean = String(username ?? "").trim().replace(/^@+/, "");
  if (!clean) return null;
  return `https://instagram.com/${clean}`;
}
//app/dashboard/listings/_components/ListingImagesManager.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ListingImage = {
  id: number;
  publicUrl: string;
  sortOrder: number;
  isCover: boolean;
  sizeBytes?: number | null;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function getErrorMessage(res: Response) {
  const data = await safeJson(res);
  return data?.error || data?.message || (typeof data === "string" ? data : null) || `Error ${res.status}`;
}

export default function ListingImagesManager(props: {
  listingId: number;
  images: ListingImage[];
  onChanged?: () => Promise<void> | void;
  disabled?: boolean; // ✅ nuevo
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  const disabled = Boolean(props.disabled);

  const ordered = useMemo(() => {
    return [...props.images].sort((a, b) => {
      const ac = a.isCover ? 1 : 0;
      const bc = b.isCover ? 1 : 0;
      if (ac !== bc) return bc - ac;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id - b.id;
    });
  }, [props.images]);

  const cover = ordered.find((x) => x.isCover) ?? null;
  const nonCover = ordered.filter((x) => !x.isCover);

  async function afterOk() {
    if (props.onChanged) {
      await props.onChanged();
    } else {
      router.refresh();
    }
  }

  async function makeCover(imageId: number) {
    if (disabled) return;
    setBusyId(imageId);

    try {
      const res = await fetch(`/api/listings/${props.listingId}/images/${imageId}/cover`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!res.ok) {
        toast.error(await getErrorMessage(res));
        return;
      }

      toast.success("Portada actualizada");
      await afterOk();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(imageId: number) {
    if (disabled) return;

    const ok = window.confirm("¿Eliminar esta imagen? Esta acción no se puede deshacer.");
    if (!ok) return;

    setBusyId(imageId);

    try {
      const res = await fetch(`/api/listings/${props.listingId}/images/${imageId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        toast.error(await getErrorMessage(res));
        return;
      }

      toast.success("Imagen eliminada");
      await afterOk();
    } finally {
      setBusyId(null);
    }
  }

  async function sendOrder(nextIds: number[]) {
    if (disabled) return false;

    const res = await fetch(`/api/listings/${props.listingId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds: nextIds }),
    });

    if (!res.ok) {
      toast.error(await getErrorMessage(res));
      return false;
    }

    toast.success("Orden actualizado");
    await afterOk();
    return true;
  }

  async function moveNonCover(imgId: number, dir: -1 | 1) {
    if (disabled) return;

    // Solo reordenamos la galería (no-cover). La portada queda fija arriba.
    const idx = nonCover.findIndex((x) => x.id === imgId);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= nonCover.length) return;

    const nextNonCoverIds = nonCover.map((x) => x.id);
    [nextNonCoverIds[idx], nextNonCoverIds[nextIdx]] = [nextNonCoverIds[nextIdx], nextNonCoverIds[idx]];

    const nextIds = cover ? [cover.id, ...nextNonCoverIds] : nextNonCoverIds;

    setBusyId(imgId);
    try {
      await sendOrder(nextIds);
    } finally {
      setBusyId(null);
    }
  }

  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay imágenes.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ordered.map((img, idx) => {
        const busy = busyId === img.id;

        const idxInNonCover = img.isCover ? -1 : nonCover.findIndex((x) => x.id === img.id);
        const canUp = !img.isCover && idxInNonCover > 0;
        const canDown = !img.isCover && idxInNonCover >= 0 && idxInNonCover < nonCover.length - 1;

        const disableButtons = disabled || busy;

        return (
          <Card key={img.id} className="overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.publicUrl}
              alt=""
              className="h-28 w-full bg-muted object-cover"
            />

            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  Imagen {idx + 1}/{ordered.length}
                </div>
                {img.isCover ? <Badge>Portada</Badge> : null}
              </div>

              <div className="text-xs text-muted-foreground">ID: {img.id}</div>

              {img.sizeBytes != null ? (
                <div className="text-xs text-muted-foreground">
                  {Math.round(img.sizeBytes / 1024)} KB
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveNonCover(img.id, -1)}
                  disabled={disableButtons || !canUp}
                  title="Subir"
                >
                  ↑
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveNonCover(img.id, 1)}
                  disabled={disableButtons || !canDown}
                  title="Bajar"
                >
                  ↓
                </Button>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => makeCover(img.id)}
                  disabled={disableButtons || img.isCover}
                >
                  {busy && !img.isCover ? "..." : img.isCover ? "Es portada" : "Hacer portada"}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(img.id)}
                  disabled={disableButtons}
                >
                  {busy ? "..." : "Eliminar"}
                </Button>
              </div>

              {disabled ? (
                <div className="text-xs text-muted-foreground">
                  Acciones deshabilitadas (publicación eliminada).
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
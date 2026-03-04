"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ListingImage = {
  id: number;
  publicUrl: string;
  sortOrder: number;
  isCover: boolean;
  sizeBytes?: number | null;
};

export default function ListingImagesManager(props: {
  listingId: number;
  images: ListingImage[];
  onChanged?: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

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
    setBusyId(imageId);
    try {
      const res = await fetch(
        `/api/listings/${props.listingId}/images/${imageId}/cover`,
        { method: "POST", credentials: "same-origin" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "No se pudo marcar portada");
        return;
      }

      await afterOk();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(imageId: number) {
    const ok = confirm("¿Eliminar esta imagen? Esta acción no se puede deshacer.");
    if (!ok) return;

    setBusyId(imageId);
    try {
      const res = await fetch(`/api/listings/${props.listingId}/images/${imageId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "No se pudo eliminar");
        return;
      }

      await afterOk();
    } finally {
      setBusyId(null);
    }
  }

  async function sendOrder(nextIds: number[]) {
    const res = await fetch(`/api/listings/${props.listingId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds: nextIds }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "No se pudo reordenar");
      return false;
    }

    await afterOk();
    return true;
  }

  async function moveNonCover(imgId: number, dir: -1 | 1) {
    // Solo reordenamos la galería (no-cover). La portada queda fija arriba.
    const idx = nonCover.findIndex((x) => x.id === imgId);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= nonCover.length) return;

    const nextNonCoverIds = nonCover.map((x) => x.id);
    [nextNonCoverIds[idx], nextNonCoverIds[nextIdx]] = [
      nextNonCoverIds[nextIdx],
      nextNonCoverIds[idx],
    ];

    const nextIds = cover ? [cover.id, ...nextNonCoverIds] : nextNonCoverIds;

    setBusyId(imgId);
    try {
      await sendOrder(nextIds);
    } finally {
      setBusyId(null);
    }
  }

  if (ordered.length === 0) {
    return <p style={{ margin: 0, opacity: 0.75 }}>Aún no hay imágenes.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 10,
      }}
    >
    {ordered.map((img, idx) => {
  const busy = busyId === img.id;

  const idxInNonCover = img.isCover ? -1 : nonCover.findIndex((x) => x.id === img.id);
  const canUp = !img.isCover && idxInNonCover > 0;
  const canDown =
    !img.isCover && idxInNonCover >= 0 && idxInNonCover < nonCover.length - 1;

  return (
    <div
      key={img.id}
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.publicUrl}
        alt=""
        style={{
          width: "100%",
          height: 120,
          objectFit: "cover",
          display: "block",
          background: "#f0f0f0",
        }}
      />

      <div style={{ padding: 8, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>Imagen {idx + 1}/{ordered.length}</span>
          {img.isCover ? (
            <span
              style={{
                border: "1px solid #ccc",
                borderRadius: 999,
                padding: "1px 6px",
                fontSize: 11,
                background: "#eefaf0",
              }}
            >
              Portada
            </span>
          ) : null}
        </div>

        <div style={{ opacity: 0.6, marginTop: 2 }}>ID: {img.id}</div>

        {img.sizeBytes != null ? (
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            {(img.sizeBytes / 1024).toFixed(0)} KB
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {/* Reorder */}
          <button
            type="button"
            title="Subir"
            onClick={() => moveNonCover(img.id, -1)}
            disabled={busy || !canUp}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: busy || !canUp ? "not-allowed" : "pointer",
            }}
          >
            ↑
          </button>

          <button
            type="button"
            title="Bajar"
            onClick={() => moveNonCover(img.id, 1)}
            disabled={busy || !canDown}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: busy || !canDown ? "not-allowed" : "pointer",
            }}
          >
            ↓
          </button>

          <button
            type="button"
            onClick={() => makeCover(img.id)}
            disabled={busy || img.isCover}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: img.isCover ? "#f3f4f6" : "#fff",
              cursor: busy || img.isCover ? "not-allowed" : "pointer",
            }}
          >
            {busy && !img.isCover ? "..." : img.isCover ? "Es portada" : "Hacer portada"}
          </button>

          <button
            type="button"
            onClick={() => remove(img.id)}
            disabled={busy}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#b91c1c",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
})}
    </div>
  );
}
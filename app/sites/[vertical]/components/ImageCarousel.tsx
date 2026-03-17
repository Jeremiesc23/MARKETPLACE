"use client";
// app/sites/[vertical]/components/ImageCarousel.tsx

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CarouselImage {
  url: string;
  alt: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const count = images.length;

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? count - 1 : c - 1));
  }, [count]);

  const next = useCallback(() => {
    setCurrent((c) => (c === count - 1 ? 0 : c + 1));
  }, [count]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (count === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-inner">
        <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Sin imágenes</span>
      </div>
    );
  }

  if (count === 1) {
    return (
      <div className="overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900">
        <div className="aspect-[4/3] w-full lg:aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div
        className="group relative overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900 shadow-sm"
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (dx > 50) prev();
          else if (dx < -50) next();
          setTouchStartX(null);
        }}
      >
        <div className="aspect-[4/3] w-full lg:aspect-square">
          {images.map((img, i) => (
             // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.url}
              alt={img.alt}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out",
                i === current ? "opacity-100 relative z-10" : "opacity-0 z-0"
              )}
            />
          ))}
          {/* Subtle bottom gradient to make dots and badge pop */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>

        {/* Prev Arrow - Only show if > 1 images */}
        {count > 1 && (
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/40 hover:border-white/40 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Imagen anterior"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Next Arrow - Only show if > 1 images */}
        {count > 1 && (
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/40 hover:border-white/40 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Imagen siguiente"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Counter Badge - Show if > 2 images */}
        {count > 2 && (
          <div className="absolute bottom-4 right-4 z-30 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
            {current + 1} / {count}
          </div>
        )}

        {/* Dot Indicators - Show if > 1 and <= 5 images for cleaner UI */}
        {count > 1 && count <= 5 && (
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Ir a imagen ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip - Show only if > 2 images */}
      {count > 2 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-[1rem] transition-all duration-300 snap-center",
                "w-[96px] h-[72px] sm:w-[112px] sm:h-[84px]",
                i === current 
                  ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 opacity-100 shadow-md" 
                  : "opacity-50 hover:opacity-100 grayscale-[0.3] hover:grayscale-0"
              )}
              aria-label={`Ver imagen ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

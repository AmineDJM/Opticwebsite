"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@optic/ui";

/** Product gallery with thumbnail selection and zoom-on-hover (§9). */
export function ProductGallery({ images }: { images: { url: string; alt: string }[] }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[active] ?? images[0];

  if (!current) {
    return <div className="aspect-square w-full rounded bg-muted" aria-hidden />;
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 sm:flex-col">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Vue ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded border-2 bg-muted",
                i === active ? "border-primary" : "border-transparent",
              )}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" unoptimized={img.url.endsWith(".svg")} />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative aspect-square flex-1 overflow-hidden rounded bg-muted"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className={cn("object-cover transition-transform duration-300", zoom && "scale-125")}
          unoptimized={current.url.endsWith(".svg")}
        />
      </div>
    </div>
  );
}

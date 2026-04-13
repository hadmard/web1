"use client";

import { useState } from "react";
import Image from "next/image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type ContentHeroImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  containerClassName?: string;
  imageClassName?: string;
  adaptiveOnMobile?: boolean;
};

export function ContentHeroImage({
  src,
  fallbackSrc,
  alt,
  containerClassName = "mt-4 aspect-[16/9]",
  imageClassName,
  adaptiveOnMobile = false,
}: ContentHeroImageProps) {
  const [hasError, setHasError] = useState(false);
  const finalSrc = resolveUploadedImageUrl(src?.trim() || fallbackSrc?.trim() || "");

  if (!finalSrc || hasError) {
    return null;
  }

  return (
    <>
      {adaptiveOnMobile ? (
        <div className="showcase-frame relative overflow-hidden rounded-2xl border border-border sm:hidden">
          {/* Use native img on mobile so the frame can follow the real image ratio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalSrc}
            alt={alt}
            className={`block h-auto w-full object-contain ${imageClassName ?? ""}`}
            loading="lazy"
            onError={() => setHasError(true)}
          />
        </div>
      ) : null}

      <div className={`${adaptiveOnMobile ? "hidden sm:block" : ""} showcase-frame relative overflow-hidden rounded-2xl border border-border ${containerClassName}`}>
        <Image
          src={finalSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 1200px"
          className={`showcase-image absolute inset-0 h-full w-full object-cover ${imageClassName ?? ""}`}
          onError={() => setHasError(true)}
        />
      </div>
    </>
  );
}

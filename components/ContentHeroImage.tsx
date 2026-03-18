import Image from "next/image";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

type ContentHeroImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  containerClassName?: string;
  imageClassName?: string;
};

export function ContentHeroImage({
  src,
  fallbackSrc,
  alt,
  containerClassName = "mt-4 aspect-[16/9]",
  imageClassName,
}: ContentHeroImageProps) {
  const finalSrc = resolveUploadedImageUrl(src?.trim() || fallbackSrc?.trim() || "");

  if (!finalSrc) {
    return null;
  }

  return (
    <div className={`showcase-frame relative overflow-hidden rounded-2xl border border-border ${containerClassName}`}>
      <Image
        src={finalSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 1200px"
        className={`showcase-image absolute inset-0 h-full w-full object-cover ${imageClassName ?? ""}`}
      />
    </div>
  );
}

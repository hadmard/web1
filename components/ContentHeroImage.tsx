import Image from "next/image";

type ContentHeroImageProps = {
  src?: string | null;
  fallbackSrc: string;
  alt: string;
  containerClassName?: string;
};

export function ContentHeroImage({
  src,
  fallbackSrc,
  alt,
  containerClassName = "mt-4 aspect-[16/9]",
}: ContentHeroImageProps) {
  const finalSrc = src?.trim() || fallbackSrc;

  if (!finalSrc) {
    return (
      <div
        className={`showcase-frame relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated ${containerClassName}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,142,93,0.16),transparent_38%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,53,72,0.14),transparent_40%)]" />
      </div>
    );
  }

  return (
    <div className={`showcase-frame relative overflow-hidden rounded-2xl border border-border ${containerClassName}`}>
      <Image
        src={finalSrc}
        alt={src?.trim() ? alt : ""}
        fill
        sizes="(max-width: 768px) 100vw, 1200px"
        className="showcase-image absolute inset-0 h-full w-full"
      />
    </div>
  );
}

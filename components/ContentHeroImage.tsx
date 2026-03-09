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

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border ${containerClassName}`}>
      <Image
        src={finalSrc}
        alt={src?.trim() ? alt : ""}
        fill
        sizes="(max-width: 768px) 100vw, 1200px"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

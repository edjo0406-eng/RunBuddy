import { heroImage } from "@/lib/public-images";

interface HeroImageProps {
  decorative?: boolean;
  className: string;
}

export function HeroImage({ decorative = false, className }: HeroImageProps) {
  // Account for the tall foreground crop, not just its narrow display width.
  const sizes = decorative
    ? "100vw"
    : "(min-width: 1024px) 1024px, (min-width: 768px) 640px, 1024px";

  return (
    <picture>
      <source type="image/webp" srcSet={heroImage.webp} sizes={sizes} />
      <img
        src={heroImage.src}
        srcSet={heroImage.jpeg}
        sizes={sizes}
        width={1408}
        height={768}
        alt={decorative ? "" : "Runners moving together at dawn"}
        loading="eager"
        fetchPriority={decorative ? "low" : "high"}
        className={className}
      />
    </picture>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandSize = "nav" | "hero";

export function BrandLogo({
  className,
  size = "nav",
}: {
  className?: string;
  size?: BrandSize;
}) {
  return (
    <Image
      src="/paag-wordmark.png"
      alt="PaaG"
      width={859}
      height={238}
      priority
      className={cn(
        "w-auto max-w-full object-contain object-left",
        size === "hero" ? "h-14 sm:h-16" : "h-8",
        className,
      )}
    />
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/paag-mark.png"
      alt="PaaG"
      width={214}
      height={214}
      className={cn("h-8 w-8 object-contain", className)}
    />
  );
}

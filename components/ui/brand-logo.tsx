import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[10px] font-bold tracking-wide text-white",
        className,
      )}
    >
      ARO
    </div>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight text-text">ARO</span>
    </div>
  );
}

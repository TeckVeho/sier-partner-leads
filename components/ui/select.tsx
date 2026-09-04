"use client";

import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 w-full rounded-md border border-border bg-white px-2 text-[13px] text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

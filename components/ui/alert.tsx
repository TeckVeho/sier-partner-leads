"use client";

import { cn } from "@/lib/utils";

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-[13px]",
        variant === "info" && "border-border bg-surface-subtle text-text",
        variant === "success" && "border-success/30 bg-success/5 text-text",
        variant === "warning" && "border-warning/30 bg-warning/5 text-text",
        variant === "danger" && "border-danger/30 bg-danger/5 text-danger",
        className,
      )}
    >
      {children}
    </div>
  );
}

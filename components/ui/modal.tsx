"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[15px] font-semibold text-text">{title}</h3>
          <Button variant="ghost" size="md" onClick={onClose}>
            閉じる
          </Button>
        </div>
        <div className={cn("px-4 py-4")}>{children}</div>
      </div>
    </div>
  );
}
